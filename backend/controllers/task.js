const mongoose = require('mongoose')
const Task = require('../models/task')
const User = require('../models/User')
const validator = require('validator')
const ROLES_LIST = require('../config/rolesList')

exports.getAll = async (req, res) => {
  const userId = req.user._id

  let tasks
  if(req.roles == "Root"){
    tasks = await Task.find().sort({createdAt: -1}).populate('createdBy', 'name').lean()
  }else if(req.roles == "Admin"){
    tasks = await Task.find({createdBy: userId}).populate('createdBy', 'name').sort({createdAt: -1}).lean()
  }else{
    tasks = await Task.find({assignedTo: userId}).populate('createdBy', 'name').sort({createdAt: -1}).lean()
  }

  if (!tasks) return res.status(400).json({ error: 'No tasks record found' })
  res.status(200).json(tasks)

  // const task = {
  //   Root: await Task.find().sort({createdAt: -1}).populate('createdBy', 'name').lean(),
  //   Admin: await Task.find({createdBy: userId}).populate('createdBy', 'name').sort({createdAt: -1}).lean(),
  //   User: await Task.find({assignedTo: userId}).populate('createdBy', 'name').sort({createdAt: -1}).lean()
  // }
  // const tasks = task(req.roles)
  // if (!tasks) return res.status(400).json({ error: 'No tasks record found' })
  // res.status(200).json(tasks)
}

exports.adminGetAll = async (req, res) => {
  const admin_id = req.user._id
  const user_id = req.body.id

  if(!user_id && (admin_id == user_id)) return res.status(400).json({ error: 'User id not found' })
  if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(404).json({error: 'No such task id found'})

  const tasks = await Task.find({user_id: user_id}).sort({createdAt: -1}).lean()
  if (!tasks) return res.status(400).json({ error: 'No tasks record found' })

  res.status(200).json(tasks)
}

exports.getById = async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({error: 'No such task id found'})

  const task = await Task.findById(id).lean().exec()
  if (!task) return res.status(404).json({error: 'No such task record found'})

  res.status(200).json(task)
}

exports.create = async (req, res) => {
  const {title, description} = req.body

  const isTitleEmpty = validator.isEmpty(title ?? "", { ignore_whitespace:true })
  const isDescriptionEmpty = validator.isEmpty(description ?? "", { ignore_whitespace:true })
  if (isTitleEmpty || isDescriptionEmpty) return res.status(400).json({ error: 'All fields must be filled'})

  try {
    const adminId = req.user._id
    const task = await Task.create({ title, description, createdBy: adminId })
    res.status(201).json(task)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

exports.update = async (req, res) => {
  const { id } = req.params
  
  const isIdEmpty = validator.isEmpty(id, { ignore_whitespace:true })
  if (isIdEmpty) return res.status(400).json({error: 'Task id required'})
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({error: 'No such task id found'})

  const ownerId = req.user._id
  const createdBy = await Task.find({createdBy: ownerId}).select('createdBy').lean().exec()
  const owner = (req.roles == ROLES_LIST.Admin) || (createdBy == ownerId)
  const updateRight = owner || (req.roles == ROLES_LIST.Root)
  if(!updateRight) return res.status(400).json({error: 'Not authorized to edit this task'})
  
  const task = await Task.findOneAndUpdate({_id: id}, {...req.body }).lean().exec()
  if (!task) return res.status(400).json({error: 'No such task record found'})

  const updatedRecord = await Task.find({createdBy: ownerId}).sort({createdAt: -1}).lean()
  res.status(200).json(updatedRecord)
}

exports.delete = async (req, res) => {
  const { id } = req.params

  const isIdEmpty = validator.isEmpty(id ?? "", { ignore_whitespace:true })
  if (isIdEmpty) return res.status(400).json({error: 'Task id required'})
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({error: 'No such task id found'})
  
  const ownerId = req.user._id
  const createdBy = await Task.find({createdBy: ownerId}).select('createdBy').lean().exec()
  const owner = (req.roles == ROLES_LIST.Admin) || (createdBy == ownerId)
  const deleteRight = owner || (req.roles == ROLES_LIST.Root)
  if(!deleteRight) return res.status(400).json({error: 'Not authorized to delete this task'})

  const task = await Task.findByIdAndDelete(id).lean().exec()
  if(!task) return res.status(400).json({error: 'No such task record found'})

  res.status(200).json(task)
}

exports.getAssignUser = async (req, res) => {
  const { id } = req.params

  const isIdEmpty = validator.isEmpty(id ?? "", { ignore_whitespace:true })
  if (isIdEmpty) return res.status(400).json({error: 'Task id required'})
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({error: 'No such task id found'})

  const tasks = await Task.findById(id).populate('assignedTo', 'name').select('assignedTo').lean().exec()
  if(!tasks) return res.status(400).json({error: 'Not assigned to user'})

  res.status(200).json(tasks)
}

exports.assignUser = async (req, res) => {
  const { task_id, user_id } = req.body

  const isTaskIdEmpty = validator.isEmpty(task_id ?? "", { ignore_whitespace:true })
  if (isTaskIdEmpty) return res.status(400).json({error: 'Task id required'})
  if (!mongoose.Types.ObjectId.isValid(task_id)) return res.status(400).json({error: 'No such task id found'})

  user_id.map(id => {
    const isUserIdEmpty = validator.isEmpty(id ?? "", { ignore_whitespace:true })
    if (isUserIdEmpty) return res.status(400).json({error: 'Task id required'})
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({error: 'No such user id found'})
  })

  const ownerId = req.user._id
  const createdBy = await Task.find({createdBy: ownerId}).select('createdBy').lean().exec()
  const owner = (req.roles == ROLES_LIST.Admin) || (createdBy == ownerId)
  const createRight = owner || (req.roles == ROLES_LIST.Root)
  if(!createRight) return res.status(400).json({error: 'Not authorized to assign this user'})

  const assignTasks = await Task.findByIdAndUpdate(task_id, {$push: {assignedTo: user_id}}).lean().exec()
  if(!assignTasks) return res.status(400).json({error: "Something went wrong, Can't assign tasks" })

  const assignUser = user_id.map(async id => await User.findByIdAndUpdate(id, {$push: {tasks: task_id}}).lean().exec())
  if(!assignUser) return res.status(400).json({error: "Something went wrong, Can't assign user"})

  //return assigned user
  const assignedUser = await Task.findById(task_id).populate('assignedTo', 'name').select('assignedTo').lean().exec()
  if(!assignedUser) return res.status(400).json({error: 'No assigned user found'})
  
  res.status(200).json(assignedUser)
}

exports.deleteAssign = async (req, res) => {
  const { id } = req.params
  const { user_id } = req.body

  const isIdEmpty = validator.isEmpty(id ?? "", { ignore_whitespace:true })
  if (isIdEmpty) return res.status(400).json({error: 'Task id required'})
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({error: 'No such task id found'})
  
  const ownerId = req.user._id
  const createdBy = await Task.find({createdBy: ownerId}).select('createdBy').lean().exec()
  const owner = (req.roles == ROLES_LIST.Admin) || (createdBy == ownerId)
  const deleteRight = owner || (req.roles == ROLES_LIST.Root)
  if(!deleteRight) return res.status(400).json({error: 'Not authorized to delete this user'})

  const removeAssign = await Task.findByIdAndUpdate(id, {$pull: {assignedTo: user_id}}).lean().exec()
  if(!removeAssign) return res.status(400).json({error: "Something went wrong, Can't delete tasks"})

  const removeUser = await User.findByIdAndUpdate(user_id, {$pull: {tasks: id}}).lean().exec()
  if(!removeUser) return res.status(400).json({error: "Something went wrong, Can't remove tasks from user"})

  const assignedUser = await Task.findById(id).populate('assignedTo', 'name').select('assignedTo').lean().exec()
  if(!assignedUser) return res.status(400).json({error: 'No assigned user found'})

  res.status(200).json(assignedUser)
}
