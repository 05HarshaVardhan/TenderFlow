'use strict';
module.exports = (sequelize, DataTypes) => {
  const Tender = sequelize.define('Tender', {
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    deadline: {
      type: DataTypes.DATE,
      allowNull: false
    },
    budget: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Companies',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('Active', 'Expired', 'Application Closed'),
      defaultValue: 'Active'
    },
    createdBy: { // ✅ Added field to track which user created the tender
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'Tenders',
    timestamps: true
  });

  Tender.associate = (models) => {
    Tender.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    Tender.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' }); // ✅ Association
    Tender.hasMany(models.Application, { foreignKey: 'tenderId', as: 'applications' });
  };

  return Tender;
};
