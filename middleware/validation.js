
// middleware/validation.js
const validateRegister = (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;
  const errors = [];

  if (!firstName || firstName.trim().length < 2) {
    errors.push('First name must be at least 2 characters long');
  }

  if (!lastName || lastName.trim().length < 2) {
    errors.push('Last name must be at least 2 characters long');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please provide a valid email address');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};

const validateProduct = (req, res, next) => {
  const { name, description, price, categoryId } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Product name must be at least 2 characters long');
  }

  if (!description || description.trim().length < 10) {
    errors.push('Product description must be at least 10 characters long');
  }

  if (!price || isNaN(price) || price <= 0) {
    errors.push('Price must be a valid positive number');
  }

  if (!categoryId) {
    errors.push('Category is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};

module.exports = { validateRegister, validateProduct };