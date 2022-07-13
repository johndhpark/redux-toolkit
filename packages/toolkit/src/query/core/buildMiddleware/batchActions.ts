import { isAnyOf } from '@internal/matchers'
import type { Matcher } from '@internal/tsHelpers'
import type { ApiEndpointQuery } from '../module'
import type { QueryThunk, RejectedAction } from '../buildThunks'
import type { SubMiddlewareBuilder } from './types'
// import { createAction } from '@reduxjs/toolkit'

export const build: SubMiddlewareBuilder = ({
  api,
  context: { apiUid },
  queryThunk,
  reducerPath,
}) => {
  return (mwApi) => {
    const typedEndpoints = api.endpoints as Record<
      string,
      ApiEndpointQuery<any, any>
    >
    /*
    const allRejectedActions = Object.values(typedEndpoints)
      .map((endpoint) => endpoint.matchRejected)
      .filter(Boolean)
    console.log('Rejected actions: ', allRejectedActions)

    const matchRejectedActions = isAnyOf(
      allRejectedActions[0],
      ...allRejectedActions.slice(1)
    )
*/
    // Define an action creator unique to this API instance
    // const batchRejectedActions = createAction<RejectedAction<any, any>[]>(
    //   `${api.reducerPath}/batch/rejectedAlreadyRunning`
    // )

    let abortedQueryActionsQueue: RejectedAction<QueryThunk, any>[] = []
    // let timerHandle: ReturnType<typeof setTimeout> | null = null
    let dispatchQueued = false

    return (next) => (action) => {
      if (queryThunk.rejected.match(action)) {
        // console.log('Matched rejected action: ', action)
        const { condition, arg } = action.meta

        if (condition && arg.subscribe) {
          // console.log('Adding action to queue...')
          // request was aborted due to condition (another query already running)
          // _Don't_ dispatch right away - queue it for a debounced grouped dispatch
          abortedQueryActionsQueue.push(action)

          // if (timerHandle) {
          //   clearTimeout(timerHandle)
          // }

          // timerHandle = setTimeout(() => {
          if (!dispatchQueued) {
            queueMicrotask(() => {
              // console.log(
              //   'Dispatching rejected actions: ',
              //   abortedQueryActionsQueue
              // )
              mwApi.dispatch(
                api.internalActions.subscriptionRequestsRejected(
                  abortedQueryActionsQueue
                )
              )
              // timerHandle = null
              abortedQueryActionsQueue = []
            })
            dispatchQueued = true
          }

          // 50ms seems like a reasonable starting batch timer
          // }, 50)

          // _Don't_ let the action reach the reducers now!
          // console.log('Bailing out of rejected action')
          return
        }
      }

      const result = next(action)

      return result
    }
  }
}
