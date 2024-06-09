const add = (num1: number, num2: number, num3: number = 0): number => {
  return num1 + num2 + num3;
};

console.log(add(3, 5));

const subtract = (num1: number, num2: number, isSum?: boolean): number => {
  let sub: number = num1 - num2;
  if (isSum === false) sub = num1 + num2;
  return sub;
};

console.log(subtract(3, 6, false));

const add2 = (
  num1: number,
  num2: number,
  person?: { name: string; isOk: boolean }
) => {
  if (person?.isOk) console.log(`${person?.name} is okay`);
  return num1 + num2;
};

console.log(add2(1, 2));

// Generic
console.log("Generic   ----------------- \n \n \n");
let added = <T extends number | string>(item1: T, item2: T): T => {
  if (typeof item1 === "number" && typeof item2 === "number") {
    return (item1 + item2) as T; // Type assertion to T
  } else if (typeof item1 === "string" && typeof item2 === "string") {
    return (item1 + item2) as T; // Type assertion to T
  } else {
    throw new Error("Arguments must be either numbers or strings");
  }
};

console.log(added("Riyad ", "karim"));
console.log(added(13, 41));
