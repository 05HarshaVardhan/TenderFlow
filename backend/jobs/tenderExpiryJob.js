const cron = require('node-cron');
const { Tender, Application } = require('../models');
const { Op } = require('sequelize');

const expireTenders = async () => {
  const now = new Date();

  try {
    const tendersToExpire = await Tender.findAll({
      where: {
        status: 'Active',
        deadline: {
          [Op.lt]: now
        }
      }
    });

    for (const tender of tendersToExpire) {
      await tender.update({ status: 'Expired' });

      await Application.update(
        { status: 'rejected' },
        {
          where: {
            tenderId: tender.id,
            status: 'pending'
          }
        }
      );
      console.log("destruction");
      console.log(`✅ Tender ID ${tender.id} expired & pending applications rejected.`);
    }
  } catch (error) {
    console.error('❌ Error expiring tenders:', error.message);
  }
};

const scheduleTenderExpiryJob = () => {
  cron.schedule('0 * * * *', expireTenders); // every hour
  console.log('📅 Tender expiry job scheduled (runs every hour)');
};

module.exports = scheduleTenderExpiryJob;
