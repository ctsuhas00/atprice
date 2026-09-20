'use strict';
const express = require('express');
const router = express.Router();

const LOCATIONS = [
  {city:'Brahmavara',district:'Udupi',state:'Karnataka',lat:13.4272,lng:74.7411},
  {city:'Udupi',district:'Udupi',state:'Karnataka',lat:13.3409,lng:74.7421},
  {city:'Manipal',district:'Udupi',state:'Karnataka',lat:13.3520,lng:74.7910},
  {city:'Kundapura',district:'Udupi',state:'Karnataka',lat:13.6200,lng:74.6900},
  {city:'Moodubelle',district:'Udupi',state:'Karnataka',lat:13.3720,lng:74.7630},
  {city:'Shirva',district:'Udupi',state:'Karnataka',lat:13.2870,lng:74.7720},
  {city:'Hiriyadka',district:'Udupi',state:'Karnataka',lat:13.3650,lng:74.7820},
  {city:'Kaup',district:'Udupi',state:'Karnataka',lat:13.2140,lng:74.7460},
  {city:'Mangaluru',district:'Dakshina Kannada',state:'Karnataka',lat:12.8680,lng:74.8420},
  {city:'Mysuru',district:'Mysuru',state:'Karnataka',lat:12.3052,lng:76.6552},
  {city:'Bengaluru',district:'Bengaluru Urban',state:'Karnataka',lat:12.9716,lng:77.5946},
  {city:'Hassan',district:'Hassan',state:'Karnataka',lat:13.0072,lng:76.0962},
  {city:'Shivamogga',district:'Shivamogga',state:'Karnataka',lat:13.9299,lng:75.5681},
  {city:'Chikkamagaluru',district:'Chikkamagaluru',state:'Karnataka',lat:13.3161,lng:75.7720},
  {city:'Madikeri',district:'Kodagu',state:'Karnataka',lat:12.4244,lng:75.7382},
  {city:'Davanagere',district:'Davanagere',state:'Karnataka',lat:14.4663,lng:75.9221},
  {city:'Ballari',district:'Ballari',state:'Karnataka',lat:15.1394,lng:76.9214},
  {city:'Belagavi',district:'Belagavi',state:'Karnataka',lat:15.8497,lng:74.4977},
];

router.get('/', (req, res) => res.json({ locations: LOCATIONS }));

module.exports = router;
