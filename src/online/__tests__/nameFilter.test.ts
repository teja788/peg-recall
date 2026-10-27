/**
 * The online name filter: rude words in every spelling people try, and real
 * names from the app's languages that happen to contain one, which must pass.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isBlockedName, onlineName } from '../nameFilter';

const BLOCKED = [
  // the words, and the ways round them
  'fuck', 'FUCK', 'Fuuuuck', 'f.u.c.k', 'f u c k', 'fück', 'fu©k', 'Fuckface', 'sh1t', '5hit',
  'a$$', 'ASS', 'Ass 1', 'Big Dick', 'D1ck', 'Dicccck', 'b1tch', 'cunt', 'pussy',
  'Mr Shit', 'Nazi', 'n4zi', 'Hitler', '🖕', 'I 🖕 you',
  // other languages
  'Puta', 'hijo de puta', 'cazzo', 'Scheiße', 'scheisse', 'kurwa', 'Kurwą', 'сука', 'Сука',
  'хуй', 'ХУЙ', 'pizda', 'blyat', 'siktir', 'kontol', 'merde', 'caralho', 'fitta', 'kut',
  'đụ địt', 'ditme', 'chutiya', 'Madarchod', 'BhenChod', 'bsdk', 'चूतिया', 'मादरचोद', 'लंड',
  'খানকি', 'புண்டை', 'దెంగు', 'ಸೂಳೆ', '씨발', 'ㅅㅂ', '병신', '傻逼', '他媽的', 'ちんこ', 'クソ',
  'كس', 'شرموطة', 'ควย', 'เหี้ย', 'thevidiya', 'lanja',
];

const NAMES = [
  // everyday names
  'Maya', 'Dadi', 'Ravi', 'Teja', 'Ananya', 'Mohammed', 'José', 'Zoë', 'Łukasz', 'Ömer', 'Søren',
  'Ægir', 'Nguyễn', 'Đức', 'Иван', 'Олена', '张伟', 'さくら', '하준', 'ساره', 'آدم', 'अनन्या',
  'রবি', 'தமிழ்', 'తేజ', 'ಕನ್ನಡ', 'สมชาย', 'Grandpa', 'Nana', 'Mom', 'Papa', '🦊', 'Leo 2',
  // names with a rude word inside
  'Cassandra', 'Hassan', 'Assad', 'Kshitij', 'Shitanshu', 'Shitara', 'Shittu', 'Nazia', 'Nazir',
  'Amina', 'Pornthip', 'Fukuda', 'Fukushima', 'Dickson', 'Dickens', 'Hancock', 'Peacock',
  'Sexton', 'Essex', 'Analia', 'Anusha', 'Titus', 'Tít', 'Pundalik', 'Wankhede', 'Arsenal',
  'Arsène', 'Cumberbatch', 'Cumali', 'Kumar', 'Boobalan', 'Bob', 'Bonner', 'Homer', 'Conor',
  'Vergara', 'Zorrilla', 'Porras', 'Pissarro', 'Pikachu', 'Kutlu', 'Dengue', 'Randi', 'Sule',
  'Magi', 'Huy', 'Hui', 'Lon', 'Pau', 'Concha', 'Babi', 'Suka', 'Pik', 'Gudda', 'Gandhi',
  'Chodavarapu', 'Sikander', 'Semenya', 'Pedro', 'Spicer', 'Niger', 'Nigeria', 'Nigel',
  'Snigdha', 'Putin', 'Polly', 'Culver', 'Debi', 'Pico', 'Lundqvist', 'Chutney', 'Assam',
  'Raper', 'Grape', 'Therapist', 'Fagundes', 'Homolka', 'Pakita',
  // the same in their own scripts
  'लंदन', 'लंडन', 'गांडीव', 'चौदह', 'চোদ্দ', 'গুদাম', 'หีบ', '시발점', 'نيكول', 'خولة', 'كسرى',
  '你妈妈',
];

test('rude words are refused, however they are spelled', () => {
  const missed = BLOCKED.filter((n) => !isBlockedName(n));
  assert.deepEqual(missed, []);
});

test('real names that contain a rude word still pass', () => {
  const refused = NAMES.filter((n) => isBlockedName(n));
  assert.deepEqual(refused, []);
});

/** Common first names from the app's languages, and the nicknames children
 *  and families use: none of them may be refused. */
const COMMON = `
  Aarav Aarush Aadhya Aanya Abhay Abhishek Aditi Aditya Ajay Akash Akshay Alok Aman Amit Amrita
  Anand Anil Anjali Ankit Anupam Anushka Arjun Arnav Arun Aryan Ashok Ayaan Ayush Bhavna Bhuvan
  Chandan Chetan Chirag Darshan Deepak Deepika Dev Dhanush Dinesh Divya Gaurav Gita Govind Harish
  Harsh Hemant Ishaan Isha Jagdish Jatin Jaya Jyoti Kabir Kajal Kamal Karan Kavya Kiran Krishna
  Kunal Lakshmi Lalit Madhav Mahesh Manish Manoj Meera Mohan Mukesh Naveen Neha Nikhil Nisha Nitin
  Pallavi Pankaj Parth Pooja Pradeep Prakash Pranav Prateek Priya Rahul Rajesh Rakesh Ramesh Ravi
  Reyansh Rohan Rohit Sachin Sai Sakshi Sameer Sandeep Sanjay Sarika Saurabh Shalini Shankar Shivam
  Shreya Shubham Siddharth Sneha Sonia Suresh Sushil Swati Tanvi Tarun Uday Varun Vedant Vihaan
  Vijay Vikram Vinay Vishal Yash Yogesh Zara Bhaskar Chakri Dhoni Gowtham Hrithik Jaideep Kishore
  Lokesh Murali Nagesh Phani Raghu Satish Srinivas Venkat Vamsi Sravani Swathi Bhargavi Keerthi
  Lavanya Mounika Pavani Ramya Sahithi Sindhu Sowmya Tejaswi Harini Ilakkiya Kaviya Nila Sangeetha
  Thamizh Vennila Anbu Arul Karthik Kathir Manikandan Selvam Senthil Thangam Vel Basavaraj Chinmay
  Girish Manjunath Nandini Pruthvi Shwetha Sumanth Yashas Abir Anik Arpita Debashish Durba Joydeep
  Moumita Paromita Rituparna Sourav Subhankar Tanmoy Aditi Omkar Sanket Tejas Prajakta Shruti
  Siddhesh Vaishnavi Mohammed Ahmed Ali Omar Yusuf Ibrahim Fatima Aisha Maryam Zainab Khadija Layla
  Hamza Bilal Tariq Karim Rashid Samir Nadia Salma Rania Huda Amal Noor Farah Liam Noah Oliver
  Elijah James William Benjamin Lucas Henry Alexander Mason Michael Ethan Daniel Jacob Logan
  Jackson Levi Sebastian Mateo Jack Owen Theodore Aiden Samuel Joseph John David Wyatt Matthew Luke
  Asher Carter Julian Grayson Leo Jayden Gabriel Isaac Lincoln Anthony Hudson Dylan Ezra Thomas
  Charles Christopher Jaxon Maverick Josiah Isaiah Andrew Elias Joshua Nathan Caleb Ryan Adrian
  Miles Eli Nolan Christian Aaron Cameron Ezekiel Colton Luca Landon Hunter Jonathan Santiago Axel
  Easton Cooper Jeremiah Angel Roman Connor Jameson Robert Greyson Jordan Ian Carson Jaxson
  Leonardo Nicholas Dominic Austin Everett Brooks Xavier Kai Jose Parker Adam Jace Wesley Kayden
  Silas Bennett Declan Waylon Weston Evan Emmett Micah Ryder Beau Damian Brayden Gael Rowan
  Harrison Bryson Sawyer Amir Kingston Jason Giovanni Vincent Ayden Chase Myles Diego Nathaniel
  Legend Jonah River Tyler Cole Braxton George Milo Zachary Kaiden Ashton Luis Jasper Kaleb Max
  Juan Zion Eric Olivia Emma Charlotte Amelia Sophia Isabella Ava Mia Evelyn Luna Harper Camila
  Sofia Scarlett Elizabeth Eleanor Emily Chloe Mila Violet Penelope Gianna Aria Abigail Ella Avery
  Hazel Nora Layla Lily Aurora Nova Ellie Madison Grace Isla Willow Zoe Riley Stella Ivy Victoria
  Emilia Zoey Naomi Hannah Lucy Elena Lillian Maya Leah Paisley Addison Natalie Valentina Everly
  Delilah Leilani Madelyn Kinsley Ruby Sophie Alice Genesis Claire Audrey Sadie Aaliyah Josephine
  Autumn Brooklyn Quinn Kennedy Cora Savannah Caroline Athena Natalia Hailey Aubrey Emery Anna Iris
  Bella Eliana Skylar Jade Gabriella Ariana Maria Adeline Lydia Sarah Nevaeh Serenity Liliana Ayla
  Everleigh Raelynn Allison Madeline Vivian Maeve Lyla Samantha Rylee Eva Melody Clara Hadley Julia
  Piper Rose Peyton Mackenzie Arianna Jasmine Faith Kaylee Daisy Freya Brielle Katherine Ximena
  Margaret Sienna Ashley Andrea Jordyn Finn Ingrid Astrid Sigrid Lars Nils Erik Sven Bjorn Magnus
  Henrik Mikkel Rasmus Frederik Mathias Emil Oskar Hugo Elsa Saga Ebba Wilma Alma Agnes Klara Ines
  Lea Hannah Paul Jonas Felix Lukas Maximilian Moritz Jan Luis Elias Ben Finn Jakob Tim Noah Leon
  Anton Theo Mila Lina Ella Emilia Marie Sophie Johanna Greta Frieda Ida Matilda Pierre Jean Louis
  Gabriel Raphael Arthur Jules Adam Lucas Hugo Nathan Ethan Manon Camille Chloe Louise Ambre Jade
  Alice Rose Juliette Lena Giulia Francesca Chiara Alessandro Lorenzo Matteo Leonardo Francesco
  Andrea Riccardo Tommaso Pietro Giovanni Marco Luca Martina Aurora Beatrice Anna Ginevra Alice
  Sofia Ludovica Santiago Mateo Sebastian Matias Nicolas Alejandro Diego Samuel Benjamin Daniel
  Valentina Martina Lucia Paula Daniela Mariana Camila Isabela Gabriela Joao Pedro Miguel Arthur
  Heitor Bernardo Davi Gael Helena Alice Laura Manuela Sophia Jakub Kacper Szymon Filip Wojciech
  Zuzanna Julia Maja Hanna Zofia Lena Tereza Eliska Adela Natalie Ondrej Vojtech Tomas Matej Dmitri
  Alexei Sergei Nikolai Mikhail Anastasia Ekaterina Olga Tatiana Svetlana Natasha Oksana Taras
  Bohdan Mykola Yulia Daria Emre Mehmet Mustafa Ahmet Yusuf Elif Zeynep Ayse Fatma Defne Ebru Kerem
  Burak Can Deniz Budi Agus Siti Dewi Putri Rizky Andi Wayan Made Ketut Intan Ayu Bayu Rina Minh
  Anh Linh Lan Hoa Mai Trang Tuan Hung Dung Long Phuong Thao Hieu Khoa Somchai Somsak Malee Nok
  Ploy Ploypailin Nattapong Siriporn Kanya Arthit Haruto Sota Yuto Hinata Yui Sakura Aoi Riku Hana
  Yuna Minato Kaito Ren Mio Minjun Seojun Doyun Jiho Seoyeon Jiwoo Haeun Sua Jian Haoran Yichen
  Zixuan Xinyi Yuxi Wei Fang Jing Ming Lei Yan Mei Lan Ying Chun Hong Hua
`;
const NICKNAMES = `
  Cutie Princess Superman Ninja Batman Puppy Kitty Bunny Monkey Cocoa Coco Peaches Sassy Bubbles
  Scooby Dino Tiger Fluffy Shiny Cookie Pudding Pickle Captain Assassin Classic Passion Glasses
  Bass Moss Dicky Chintu Pinky Bunty Golu Monu Sonu Pappu Gudiya Munna Chhotu Tinku Bablu Raju
  Bittu Lalli Chiku Kuttan Kutty Ammu Appu Kanna Chinnu Bujji Pandu Chikki Babu Puttu Thangam
  Grandma Grandpa Nani Nana Dadu Ajji Ajja Paati Thatha Amma Appa Baba Mama Mami Chacha Chachi Bua
  Mausi Didi Bhaiya Anna Akka Thambi Chechi Chettan Bhabhi Jiju Uncle Aunty Sir Madam Boss King
  Queen Hero Star Champ Rocket Lucky Happy Sunny Smiley Sparkle Rainbow Unicorn Dragon Pikachu Elsa
  Moana Doraemon Shinchan Nobita Chhota Bheem Motu Patlu Kitkat Oreo Mango Banana Pista Kaju Laddoo
  Jalebi Rasgulla Gulab Choco Chocolate Vanilla Sugar Honey Sweety Babe Baby Bebo Pumpkin Peanut
  Buttercup Cupcake Muffin Snowy Shadow Blaze Thunder Storm Sky Ocean Pearl Diamond Ruby Jade Amber
`;

test('common first names and nicknames all pass', () => {
  const all = [...COMMON.split(/\s+/), ...NICKNAMES.split(/\s+/)].filter(Boolean);
  assert.ok(all.length > 900, `${all.length} names`);
  assert.deepEqual(all.filter((n) => isBlockedName(n)), []);
});

test('onlineName: cleaned, and nothing (play as the animal) when empty or refused', () => {
  assert.equal(onlineName('  Maya  '), 'Maya');
  assert.equal(onlineName('fuck'), undefined);
  assert.equal(onlineName('   '), undefined);
  assert.equal(onlineName(42), undefined);
  assert.equal(isBlockedName(''), false);
});
