"use strict";
const common=require("./state");
class CompanionStore extends common.ScopedStore {constructor(options){super(options,{version:1,connections:[],composio:{mode:"managed",key:"",userId:""},settings:{approvalGrants:[]},receipts:[]});}}
module.exports={...common,CompanionStore};
