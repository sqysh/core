const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/
const isValidEmail = (email: string) => {
  return re.test(email)
}

export default isValidEmail
