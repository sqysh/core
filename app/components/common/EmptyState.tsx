import { FC } from 'react'
import { useAppDispatch } from '@/app/lib/redux/store'
import { motion } from 'framer-motion'
import { Anchor, Flag, Layers, Sailboat, Scroll, Users } from 'lucide-react'
import { setInputs } from '@/app/lib/redux/slices/formSlice'
import { useSession } from 'next-auth/react'

const EmptyState: FC<{
  searchQuery: string
  statusFilter: string
  typeFilter: string
  title: string
  advice: string
  func: any
  action: string
  formName?: string
}> = ({ searchQuery, statusFilter, typeFilter, title, advice, func, action, formName }) => {
  const dispatch = useAppDispatch()
  const session = useSession()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
      {title === 'Anchor' ? (
        <Anchor className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      ) : title === 'Parley' ? (
        <Scroll className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      ) : title === 'Treasure Map' ? (
        <Layers className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      ) : title === `Stowaway'` ? (
        <Flag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      ) : title === `Swabbie'` ? (
        <Sailboat className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      ) : (
        <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      )}
      <h3 className="text-xl font-semibold text-gray-400 mb-2">No {title}s found</h3>
      <p className="text-gray-500 mb-6">
        {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
          ? 'Try adjusting your search or filters'
          : advice}
      </p>
      <motion.button
        onClick={() => {
          if (formName === 'parleyForm') {
            dispatch(setInputs({ formName, data: { requesterId: session.data?.user?.id } }))
          } else if (formName === 'treasureMapForm') {
            dispatch(setInputs({ formName, data: { giverId: session.data?.user?.id } }))
          } else if (formName === 'anchorForm') {
            dispatch(setInputs({ formName, data: { giverId: session.data?.user?.id } }))
          }
          dispatch(func())
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="px-6 py-3 bg-linear-to-r from-teal-600 via-cyan-600 to-blue-600 text-white rounded-lg hover:from-teal-500 hover:via-cyan-500 hover:to-blue-500 transition-all font-semibold mx-auto cursor-pointer"
      >
        <span>{action}</span>
      </motion.button>
    </motion.div>
  )
}

export default EmptyState
