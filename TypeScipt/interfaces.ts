interface UserInterface {
  name: string;
  age: number;
  id: number;
  email: string;
  address: AddressInterface;
}

interface AddressInterface {
  road: string;
  houseNumber: string;
  district: string;
}

interface FullAddressInterface extends AddressInterface {}

const user: UserInterface = {
  name: "riyad",
  age: 25,
  id: 1,
  email: "riyad@gmail.com",
  address: {
    road: "13",
    houseNumber: "13H/6",
    district: "Dhaka",
  },
};

console.log(user);
