'use client'

import { useState } from 'react'
import { StageCommand } from '../constants/stage.constants'
import { sendStageCommand } from '../actions/stage/sendStageCommand'

export function useSend() {
  const [ok, setOk] = useState(true)
  async function send(cmd: StageCommand) {
    const res = await sendStageCommand(cmd)
    setOk(res.success)
    return res.success
  }
  return { ok, send }
}
