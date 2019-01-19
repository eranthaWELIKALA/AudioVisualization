var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('playlist', { title: 'Express' });
});

/* call linkinpark  page*/
router.post('/linkinpark',function(req,res,next){
  
  res.render('index',{ });
  });
  
router.post('/edsheeran',function(req,res,next){
  
  res.render('index1',{ });
  });

router.post('/err',function(req,res,next){
  
  res.render('error.hbs',{ });
});
  


router.post('/back',function(req,res,next){  
    res.redirect('/');
});
 



module.exports = router;
