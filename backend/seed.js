const db = require('./models');

async function seedDatabase() {
  try {
    await db.sequelize.sync({ force: true });

    const company = await db.Company.create({
      name: 'BuildTech Inc.',
      industry: 'Construction',
      description: 'We specialize in building infrastructure.',
      logoUrl: 'https://example.com/logo.png'
    });

    const user = await db.User.create({
      email: 'manager@buildtech.com',
      passwordHash: 'hashedpassword123',
      fullName: 'John Manager',
      role: 'admin',
      companyId: company.id
    });

    const cement = await db.GoodsServices.create({ name: 'Cement', category: 'Building', description: 'Premium quality cement' });
    const bricks = await db.GoodsServices.create({ name: 'Bricks', category: 'Building', description: 'Red bricks' });

    await company.addGoodsServices([cement, bricks]);

    const tender = await db.Tender.create({
      title: 'Build New School',
      description: 'Construction of a 10-room school building',
      deadline: new Date('2025-12-31'),
      budget: 1000000,
      companyId: company.id
    });

    const company2 = await db.Company.create({
      name: 'LogiBuild Co.',
      industry: 'Logistics',
      description: 'Materials delivery & logistics',
      logoUrl: 'https://example.com/logibuild.png'
    });

    const application = await db.Application.create({
      tenderId: tender.id,
      companyId: company2.id,
      quotationAmount: 950000,
      proposalText: 'We propose timely and affordable construction.'
    });

    console.log('✅ Test data inserted successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error inserting test data:', err);
    process.exit(1);
  }
}

seedDatabase();
