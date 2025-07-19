const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models');

const { User } = db;

  const profile = async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ msg: 'Unauthorized' });
      }

      const userId = req.user.id;
      const user = await User.findByPk(userId);

      
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ msg: 'Internal server error' });
    }
  }

  const readall = async (req, res) => {
    try {
      
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;

      const records = await User.findAll({ limit, offset });
      return res.json(records);
    } catch (e) {
      return res.json({ msg: "Failed to read", status: 500, route: "/read" });
    }
  }

  const readId = async (req, res) => {
    try {
      const { id } = req.params;
      const record = await User.findOne({ where: { id } });
      return res.json(record);
    } catch (e) {
      return res.json({ msg: "Failed to read", status: 500, route: "/read/:id" });
    }
  }

  const update = async (req, res) =>{
    try {
      const updated = await User.update({ ...req.body }, { where: { id: req.params.id } });
      if (updated) {
        const updatedUser = await User.findByPk(req.params.id);
        res.status(200).json(updatedUser);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error updating the User', error });
    }
  }

  const deleteId = async (req, res) => {
    try {
      const { id } = req.params;
      const record = await User.findOne({ where: { id } });

      if (!record) {
        return res.json({ msg: "Cannot find existing record" });
      }

      const deletedRecord = await record.destroy();
      return res.json({ record: deletedRecord });
    } catch (e) {
      return res.json({
        msg: "Failed to read",
        status: 500,
        route: "/delete/:id",
      });
    }
  }


// module.exports = {register, login, adminLogin, refresh, readId, readall, update, deleteId};


module.exports = {readId, readall, update, deleteId};