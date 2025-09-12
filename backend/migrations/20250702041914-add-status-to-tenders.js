'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Tenders', 'status', {
      type: Sequelize.ENUM('Active', 'Expired', 'Application Closed'),
      defaultValue: 'Active',
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Tenders', 'status');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Tenders_status";');
  },
};