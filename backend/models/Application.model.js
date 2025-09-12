'use strict';
module.exports = (sequelize, DataTypes) => {
  const Application = sequelize.define('Application', {
    tenderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Tenders',
        key: 'id'
      }
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
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending'
    },
    quotationAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate:{
        min:0.01
      } // 🔒 Make this mandatory
    },
    proposalText: DataTypes.TEXT
  }, {
    tableName: 'Applications',
    timestamps: true
  });

  Application.associate = (models) => {
    Application.belongsTo(models.Tender, { foreignKey: 'tenderId', as: 'tender' });
    Application.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
  };

  return Application;
};
