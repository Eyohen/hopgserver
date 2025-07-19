
// controllers/product.js
const db = require('../models');
const { Product, Category, Review, User } = db;
const { uploadToCloudinary } = require('../middleware/cloudinary');
const { Op } = require('sequelize');

const create = async (req, res) => {
  try {
    const { name, description, price, originalPrice, categoryId, flavors, sizes, nutritionFacts, ingredients, stockQuantity, weight, brand, sku, tags } = req.body;

    let imageUrl = '';
    let images = [];

    // Handle single image upload
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      if (uploadResult.message === "error") {
        throw new Error(uploadResult.error.message);
      }
      imageUrl = uploadResult.url;
    }

    // Handle multiple images if provided
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadToCloudinary(file.buffer);
        if (uploadResult.message === "success") {
          images.push(uploadResult.url);
        }
      }
    }

    // Generate SKU if not provided
    const generatedSku = sku || `PRO-${Date.now()}`;

    const product = await Product.create({
      name,
      description,
      price,
      originalPrice,
      categoryId,
      imageUrl,
      images,
      flavors: flavors ? JSON.parse(flavors) : null,
      sizes: sizes ? JSON.parse(sizes) : null,
      nutritionFacts: nutritionFacts ? JSON.parse(nutritionFacts) : null,
      ingredients,
      stockQuantity: stockQuantity || 0,
      weight,
      brand,
      sku: generatedSku,
      tags: tags ? JSON.parse(tags) : null
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      minPrice,
      maxPrice,
      brand,
      inStock,
      featured
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (category) where.categoryId = category;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (minPrice) where.price = { [Op.gte]: minPrice };
    if (maxPrice) where.price = { ...where.price, [Op.lte]: maxPrice };
    if (brand) where.brand = brand;
    if (inStock === 'true') where.stockQuantity = { [Op.gt]: 0 };
    if (featured === 'true') where.isFeatured = true;

    const products = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: Review,
          as: 'reviews',
          attributes: ['rating'],
          separate: true
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      products: products.rows,
      pagination: {
        total: products.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(products.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get products', error: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        },
        {
          model: Review,
          as: 'reviews',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['firstName', 'lastName']
            }
          ]
        }
      ]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get product', error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Handle image upload
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      if (uploadResult.message === "error") {
        throw new Error(uploadResult.error.message);
      }
      updateData.imageUrl = uploadResult.url;
    }

    // Parse JSON fields
    if (updateData.flavors) updateData.flavors = JSON.parse(updateData.flavors);
    if (updateData.sizes) updateData.sizes = JSON.parse(updateData.sizes);
    if (updateData.nutritionFacts) updateData.nutritionFacts = JSON.parse(updateData.nutritionFacts);
    if (updateData.tags) updateData.tags = JSON.parse(updateData.tags);

    const [updated] = await Product.update(updateData, { where: { id } });

    if (updated) {
      const updatedProduct = await Product.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          }
        ]
      });
      res.json({ message: 'Product updated successfully', product: updatedProduct });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to update product', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Product.destroy({ where: { id } });

    if (deleted) {
      res.json({ message: 'Product deleted successfully' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product', error: error.message });
  }
};

const getFeatured = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const products = await Product.findAll({
      where: { isFeatured: true, isActive: true },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ products });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get featured products', error: error.message });
  }
};

module.exports = { create, getAll, getById, update, deleteProduct, getFeatured };