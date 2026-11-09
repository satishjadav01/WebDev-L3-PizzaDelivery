/** The only shape in which a user leaves the API; keeps the model's internals private. */
export function toUserDto(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
  };
}
