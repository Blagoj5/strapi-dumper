### Strapi Dumper

![Peek 2022-12-06 00-08](https://user-images.githubusercontent.com/50581470/205762709-4ade0bda-add5-4e41-bc44-86350ea1c9dc.gif)


## How to make it work

In order for the plugin to work correctly and return the full mongo-db data inside of a document in the specified collection go to your strapi backend server:
- Run `npx strapi generate:api dump`
- Routes file should contain:
  ```ts
  {
    "routes": [
      {
        "method": "GET",
        "path": "/dumps/:collectionName",
        "handler": "dump.find",
        "config": {
          "policies": []
        }
      }
    ]
  }
  ```
- Add custom find method to the controller:
  ```ts
  'use strict';

  module.exports = {
    async find(ctx) {
      const {collectionName} = ctx.params;

      const entities = await strapi.query(collectionName).model.find();

      return entities;
    },
  };
  ```
