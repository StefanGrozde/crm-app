const { sequelize } = require('./config/db');
const Contact = require('./models/Contact');
const Company = require('./models/Company');

async function simpleTest() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connected successfully');
    
    console.log('Testing Contact model...');
    const contactCount = await Contact.count();
    console.log('Contact count:', contactCount);
    
    console.log('Testing Company model...');
    const companyCount = await Company.count();
    console.log('Company count:', companyCount);
    
    console.log('Testing simple Contact query...');
    const contacts = await Contact.findAll({
      where: {
        firstName: { [require('sequelize').Op.iLike]: 'Jo%' }
      },
      attributes: ['firstName', 'lastName'],
      limit: 5,
      raw: true
    });
    console.log('Contacts found:', contacts);
    
  } catch (error) {
    console.error('Error:', error);
    console.error('Error stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

simpleTest(); 