import { NextResponse } from 'next/server'

export function handleServerError(error: unknown, operationalContext: string) {
  console.error(`[CRITICAL EXCEPTION] Intercepted error inside: ${operationalContext} ->`, error)

  const clearMessage = error instanceof Error ? error.message : 'Internal system routing conflict'

  return NextResponse.json(
    {
      success: false,
      error: 'System processing bottleneck',
      debugDetails: process.env.NODE_ENV === 'development' ? clearMessage : undefined,
    },
    { status: 500 },
  )
}
