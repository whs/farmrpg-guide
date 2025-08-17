/* eslint-disable */
// @ts-ignore
import * as types from './graphql';



const documents = {}
export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
