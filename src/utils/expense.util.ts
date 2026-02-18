function createError(statusCode:number, errorMessage:string) {
  return { statusCode, errorMessage };
}

export default createError
