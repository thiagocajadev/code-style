// Princípios: erros tipados, falhar rápido, tratamento centralizado

class BaseError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }

  toJSON() {
    const json = { name: this.name, message: this.message, code: this.code };
    return json;
  }
}

class NotFoundError extends BaseError {
  constructor(message) {
    super(message, "NOT_FOUND");
  }
}

class ValidationError extends BaseError {
  constructor(message) {
    super(message, "VALIDATION_ERROR");
  }
}

try {
  console.log(getUser(1));
  console.log(getUser(99));
} catch (error) {
  console.log(error.toJSON());
}

function getUser(id) {
  if (!id) throw new ValidationError("id is required");

  const user = findUser(id);
  return user;
}

function findUser(id) {
  const users = [{ id: 1, name: "Alice" }];
  const user = users.find((u) => u.id === id);

  if (!user) throw new NotFoundError(`User ${id} not found`);

  return user;
}
