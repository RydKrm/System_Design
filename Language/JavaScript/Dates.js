// ! JavaScript Date methode

// ? JS Date methode are static

let date = new Date();

// console.log(date); //* year-month-day T hour:minutes:second.milisecond Z means => UTC(Coordinated Universal Time) Zone

date = new Date("2024-03-18"); //* return only date not time
// ? js has three type of date formet
// * 1 -> ISO Date => "2024-03-25"
date = new Date(); // * ISO Date()

// * 2 -> Short Date => "03/25/2024"
// * 3 -> Long Date => "Mar 18 2024"

// ? Date Get Method
// * get full year
date = new Date().getFullYear(); // * 2024

// * get month
// * in js month is start from 0 as january and end in 11 december
date = new Date().getMonth();

// * get Date
// * get day of month from 1 to 31
date = new Date().getDate(); // * 18

// * get Day
// * get the day number in week
date = new Date().getDay(); // * 1 for monday

// * get hours
// * get hours of the day 0 to 23
date = new Date().getHours();

// * get minutes
// * get the minutes from 0-59
date = new Date().getMinutes();

// * get second
// * return current second
date = new Date().getSeconds();

date = new Date().setMonth(20);

console.log(date);
