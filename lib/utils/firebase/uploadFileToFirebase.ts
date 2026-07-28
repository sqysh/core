import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase/firebase.config'

/**
 * Uploads a video or image file to Firebase Storage.
 * @param {File} file - The video file to upload.
 * @param {(progress: number) => void} onProgress - Callback for upload progress (optional).
 * @returns {Promise<string>} - The download URL of the uploaded video.
 */
const uploadFileToFirebase = async (
  file: File,
  onProgress: (progress: number) => void = () => {},
  type: 'image' | 'video' = 'image'
): Promise<string> => {
  if (!file) {
    throw new Error('No file provided')
  }

  // Create a storage reference
  const storageRef = ref(storage, `${type}s/${file.name}`)

  // Start the upload task
  const uploadTask = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Calculate progress as a percentage
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        const cappedProgress = Math.min(progress, 95)
        onProgress(cappedProgress)
      },
      (error) => {
        reject(error)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(downloadURL)
        } catch (error) {
          reject(error)
        }
      }
    )
  })
}

export default uploadFileToFirebase
