// object types
type User = {
  name: string;
  age: number;
};

// Type guard function
function isUser(obj: any): obj is User {
  return (
    typeof obj === "object" &&
    typeof obj.name === "string" &&
    typeof obj.age === "number"
  );
}

const data: unknown = { name: "John", age: 30 };

if (isUser(data)) {
  console.log(data.name); // TypeScript now knows data is a User
}

// Primitive types
type Username = string;
type Count = number;
type IsActive = boolean;

// Union types (OR)
type Status = "active" | "inactive" | "pending";
type ID = string | number;

// Array types
type Names = string[];
type Users = User[];

// Function types
type Callback = (data: string) => void;
type Calculate = (a: number, b: number) => number;

// With generics (like a template)
type Box<T> = {
  value: T;
};

// Intersection types (AND - combines types)
type Admin = User & {
  permissions: string[];
};

let user1 : Username = "pragma";

console.log(user1);

