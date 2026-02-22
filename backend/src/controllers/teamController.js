const Team = require('../models/Team');
const User = require('../models/User');

exports.createTeam = async (req, res) => {
  try {
    const { name, description, memberEmails } = req.body;

    // Find users by emails
    const members = await User.find({ email: { $in: memberEmails } }).select('_id');
    const memberIds = members.map(m => m._id);
    
    // Always include the creator
    if (!memberIds.includes(req.user.userId)) {
      memberIds.push(req.user.userId);
    }

    const team = await Team.create({
      name,
      description,
      company: req.user.companyId,
      members: memberIds,
      createdBy: req.user.userId
    });

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: 'Error creating team', error: error.message });
  }
};

exports.getMyTeams = async (req, res) => {
  try {
    // Find all teams where the user is a member
    const teams = await Team.find({ members: req.user.userId })
      .populate('members', 'name email role')
      .sort('-createdAt');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teams' });
  }
};