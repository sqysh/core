import { deleteObject, ref } from 'firebase/storage'
import { storage } from '../../firebase/firebase.config'

const deleteFileFromFirebase = async (
  fileName: string,
  type: 'image' | 'video' | 'document' | 'poster' | 'ebook' = 'image'
): Promise<void> => {
  if (!fileName) {
    throw new Error('No file name provided')
  }

  try {
    // Create a storage reference to the file
    const filePath = `${type}s/${fileName}` // Match the upload folder structure
    const fileRef = ref(storage, filePath)

    await deleteObject(fileRef)
  } catch (error) {
    throw error
  }
}

export default deleteFileFromFirebase
