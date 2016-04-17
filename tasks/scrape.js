var _ = require('lodash');
var WebsiteXkcdClass = require('../models/website.js').WebsiteXkcdClass;
var WebsiteXKCD = new WebsiteXkcdClass();

WebsiteXKCD.scrapeAllUndownloaded().then((models) => {
  console.info("WebsiteXKCD.scrapeAllUndownloaded()", _.map(models, (model) => model.get('url')));
})


