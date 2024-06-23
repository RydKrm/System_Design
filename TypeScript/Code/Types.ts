const printAll = (str: string[] | null) => {
  if (str && typeof str === "object") {
    for (const s of str) {
      console.log(s);
    }
  }
};

const TwoString = (first: string | number, second: string | boolean) => {
  if (first === second) {
    console.log(first.toLowerCase());
    console.log(second.toUpperCase());
  } else {
    console.log("first => ", first, " Second => ", second);
  }
};
