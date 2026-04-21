// Princípios: Result pattern, typed errors, sem throws em fluxo de negócio

type Product = {
  readonly id: number;
  readonly name: string;
  readonly price: number;
};

type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

const saveResult = saveProduct({ id: 1, name: "Widget", price: 29.9 });
console.log(saveResult.ok ? "saved" : `error: ${saveResult.error}`);

const invalidResult = saveProduct({ id: 2, name: "", price: -1 });
console.log(invalidResult.ok ? "saved" : `error: ${invalidResult.error}`);

function saveProduct(product: Product): Result<Product> {
  const validationResult = validateProduct(product);
  if (!validationResult.ok) return validationResult;

  try {
    persistProduct(product);
    const success: Result<Product> = { ok: true, value: product };

    return success;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    const failure: Result<Product> = { ok: false, error: `Unexpected error: ${message}` };

    return failure;
  }
}

function validateProduct(product: Product): Result<Product> {
  if (!product.name.trim()) {
    const missingName: Result<Product> = { ok: false, error: "Name is required." };
    return missingName;
  }

  if (product.price <= 0) {
    const invalidPrice: Result<Product> = { ok: false, error: "Price must be greater than zero." };
    return invalidPrice;
  }

  const valid: Result<Product> = { ok: true, value: product };

  return valid;
}

function persistProduct(product: Product): void {
  console.log(`persisting ${product.name}`);
}
