3|qwest-prod  | Error getting similar tags to idea:  1 | var __defProp=Object.defineProperty;var __export=(target,all)=>{for(var name in all)__defProp(target,name,{get:all[name],enumerable:!0})};var Emitter=class{collectable={};listeners={};interceptors;constructor({interceptors}={}){this.interceptors=interceptors??{}}subscribe(event,listener,historic=!1){if(this.listeners[event]||(this.listeners[event]=[]),!this.isSubscribed(event,listener)&&(this.listeners[event]?.push(listener),historic&&this.collectable[event])){let buffer=this.collectable[event];delete this.collectable[event];for(let args of buffer)listener(...args)}}async subscribeOnce(event,historic=!1){if(historic&&this.collectable[event]){let args=this.collectable[event]?.shift();if(this.collectable[event]?.length===0&&delete this.collectable[event],args)return args}return new Promise(resolve=>{let resolved=!1,listener=(...args)=>{resolved||(resolved=!0,this.unSubscribe(event,listener),resolve(args))};this.subscribe(event,listener,!1)})}unSubscribe(event,listener){if(this.listeners[event]){let index=this.l
3|qwest-prod  | ResponseError: There was a problem with the database: Expected a array<float> but found NULL
3|qwest-prod  |       at new SurrealDbError (1:23)
3|qwest-prod  |       at new ResponseError (/root/webroot/qwest-prod/node_modules/surrealdb/dist/index.mjs:1:5206)
3|qwest-prod  |       at <anonymous> (/root/webroot/qwest-prod/node_modules/surrealdb/dist/index.mjs:1:54539)
3|qwest-prod  | Error finding similar tags to idea: 435 |       });
3|qwest-prod  | 436 |       return;
3|qwest-prod  | 437 |     }
3|qwest-prod  | 438 |     const similar = await Tag.getSimilarToIdea(user.id, ideaId);
3|qwest-prod  | 439 |     if (!similar) {
3|qwest-prod  | 440 |       throw new Error("Couldn't get similar.");
3|qwest-prod  |                   ^
3|qwest-prod  | error: Couldn't get similar.
3|qwest-prod  |       at <anonymous> (/root/webroot/qwest-prod/app/api/tags.ts:440:13)
