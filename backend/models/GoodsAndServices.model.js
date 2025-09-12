'use strict';
module.exports = (sequelize, DataTypes) => {
  const GoodsServices = sequelize.define('GoodsServices', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    category: DataTypes.STRING,
    description: DataTypes.TEXT
  }, {
    tableName: 'GoodsServices',
    timestamps: true
  });

  GoodsServices.associate = (models) => {
    GoodsServices.belongsToMany(models.Company, {
      through: 'CompanyGoodsServices',
      foreignKey: 'goodsServiceId',
      as: 'companies'
    });
  };

  return GoodsServices;
};
