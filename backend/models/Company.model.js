'use strict';
module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique:true,
      validate:{
        len:[2,100]
      }
    },
    industry: DataTypes.STRING,
    description: DataTypes.TEXT,
    logoUrl: DataTypes.STRING
  }, {
    tableName: 'Companies',
    timestamps: true
  });

  Company.associate = (models) => {
    Company.hasMany(models.User, { foreignKey: 'companyId', as: 'users' });
    Company.hasMany(models.Tender, { foreignKey: 'companyId', as: 'tenders' });
    Company.hasMany(models.Application, { foreignKey: 'companyId', as: 'applications' });
    Company.belongsToMany(models.GoodsServices, {
      through: 'CompanyGoodsServices',
      foreignKey: 'companyId',
      as: 'goodsServices'
    });
  };

  return Company;
};
