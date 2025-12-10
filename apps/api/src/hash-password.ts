import * as bcrypt from 'bcrypt';

async function hashPassword() {
  const password = 'password';
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  console.log(hashedPassword);
}

hashPassword();
