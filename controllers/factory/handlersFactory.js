const expressAsyncHandler = require("express-async-handler")
const ApiError = require("../../utils/apiError")

module.exports = {
    addOne: (model) => expressAsyncHandler(async (req, res, next) => {
        if (!req.body.date) req.body.date = Date.now()

        const document = await model.create(req.body)
        res.status(201).json({ status: 'Success', data: document })
    }),
    getAll: (model, modelName) => expressAsyncHandler(async (req, res, next) => {
        let document = model.find({})

        // Pagination
        const page = req.query.page * 1 || 1
        const limit = req.query.limit * 1 || 30
        const skip = (page - 1) * limit
        const endIndex = page * limit
        const countDoc = await model.countDocuments()
        const paginationResult = {}
        paginationResult.currentPage = page;
        paginationResult.limit = limit;
        paginationResult.noOfPages = Math.ceil(countDoc / limit);
        if (endIndex < countDoc) paginationResult.next = page + 1
        if (skip > 0) paginationResult.prev = page - 1
        if (req.query.page || req.query.limit) {
            document = document.skip(skip).limit(limit)
        }

        // Search
        let query = {};
        if (req.query.keyword) {
            if (modelName === "appointment") {
                query.$or = [
                    { patientName: { $regex: req.query.keyword, $options: 'i' } },
                ]
            } else {
                query = { name: { $regex: req.query.keyword, $options: 'i' } }
            }
            document = document.find(query)
        }

        // Sort
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ')
            document = document.sort(sortBy)
        } else {
            document = document.sort('-createdAt')
        }

        const doc = await document
        res.status(200).json({ status: 'Success', results: doc.length, paginationResult, data: doc })
    }),
    getOne: (model) => expressAsyncHandler(async (req, res, next) => {
        const { id } = req.params

        const document = await model.findOne({ _id: id })

        if (!document) {
            return next(new ApiError(`There is no document for this id ${id}`))
        }
        res.status(200).json({ status: 'Success', data: document })
    }),
    updateOne: (model) => expressAsyncHandler(async (req, res, next) => {
        const { id } = req.params

        const document = await model.findByIdAndUpdate(id, req.body, { new: true })

        if (!document) {
            return next(new ApiError(`There is no document for this id ${id}`))
        }
        res.status(200).json({ status: 'Success', data: document })
    }),
    deleteOne: (model) => expressAsyncHandler(async (req, res, next) => {
        const { id } = req.params

        const document = await model.findByIdAndDelete(id)

        if (!document) {
            return next(new ApiError(`There is no document for this id ${id}`))
        }
        res.status(200).json({ status: 'Success', msg: `Document Deleted Successfully` })
    }),
    deleteAll: (model) => expressAsyncHandler(async (req, res, next) => {
        await model.deleteMany()
        res.status(200).json({ status: 'Success', msg: `All Documents Deleted Successfully` })
    }),
    addInModel: (model, arrayName) => expressAsyncHandler(async (req, res, next) => {
        const { id } = req.params
        if (!req.body.date) req.body.date = Date.now()

        const document = await model.findByIdAndUpdate(id, {
            $addToSet: {
                [arrayName]: req.body
            }
        }, { new: true })

        if (!document) {
            return next(new ApiError(`There is no document for this id ${id}`, 400))
        }
        res.status(200).json({ status: 'Success', msg: `${arrayName} Added Successfully`, data: document[arrayName] })

    }),
    updateInModel: (model, arrayName, fields) => expressAsyncHandler(async (req, res, next) => {
        const { id } = req.params

        const document = await model.findById(id)
        if (!document) {
            return next(new ApiError(`There is no document for this id ${id}`, 400))
        }

        // Get Index
        const docIndex = document[arrayName].findIndex(item =>
            item._id.toString() === req.body.docId
        )
        // Update By Index
        if (docIndex > -1) {
            const myTreatments = document[arrayName][docIndex]
            fields.split(' ').forEach(element => {
                myTreatments[element] = req.body[element] || myTreatments[element]
            });
            document[arrayName][docIndex] = myTreatments
        }

        await document.save()
        res.status(200).json({ status: 'Success', msg: `${arrayName} Updated Successfully`, data: document[arrayName] })
    }),
    deleteInModel: (model, arrayName) => expressAsyncHandler(async (req, res, next) => {
        const { id } = req.params
        const { docId } = req.body

        const document = await model.findByIdAndUpdate(id, {
            $pull: { [arrayName]: { _id: docId } }
        }, { new: true })

        if (!document) {
            return next(new ApiError(`There is no document for this id ${id}`, 400))
        }
        res.status(200).json({ status: 'Success', msg: `${arrayName} Removed Successfully`, data: document[arrayName] })
    }),
}