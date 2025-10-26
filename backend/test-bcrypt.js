import bcrypt from 'bcryptjs';

const password = 'password123';
const hash = '$2a$10$JBvqPjLMe3TKJN.n6D4uCuVH3dbqR4j9P5knDDO2/k8lw9BBZvlbm';

async function test() {
  try {
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('Hash type:', typeof hash);
    console.log('Password type:', typeof password);

    const isValid = await bcrypt.compare(password, hash);
    console.log('Is valid:', isValid);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
