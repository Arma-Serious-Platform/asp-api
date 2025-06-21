import { seed } from './seed';

seed().then(() => {
  console.log('Database seeded');
}).catch((error) => {
  console.log('Error seeding database');
  console.error(error);
})
