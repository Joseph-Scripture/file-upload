import prisma from "../config/db.js";

export const createFolder = async (req, res) => {
    try {
        const {name} = req.body
        if(!name) {
            return res.status(400).json({success:false, message: "Folder name is required"})
        }
        const folder = await prisma.folder.create({
            data: {
                name,
                userId: req.user.id
            }
        })
        return res.status(201).json({success:true, message: "Folder created successfully", folder})
    } catch (error) {
        console.log(error)
        return res.status(500).json({success:false, message: "Internal server error"})
    }
}

export const getFolders = async (req, res) => {
    try {
        const folders = await prisma.folder.findMany({
            where: {
                userId: req.user.id
            },
            include: {
                files: true
            }
        })
        return res.status(200).json({success:true, message: "Folders fetched successfully", folders})
    } catch (error) {
        console.log(error)
        return res.status(500).json({success:false, message: "Internal server error"})
    }
}

export const deleteFolder = async (req, res) => {
    try {
        const {id} = req.params
        if(!id) {
            return res.status(400).json({success:false, message: "Folder ID is required"})
        }
        const folder = await prisma.folder.findUnique({
            where: {
                id,
                userId: req.user.id
            }
        })
        if(!folder) {
            return res.status(404).json({success:false, message: "Folder not found"})
        }
        await prisma.folder.delete({
            where: {
                id,
                userId: req.user.id
            }
        })
    } catch(error){
        console.error(error)
        return res.status(500).json({success:false, message: "Internal server error"})
    }
}