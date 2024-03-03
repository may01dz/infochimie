
if (!Array.isArray) {
	Array.isArray = function(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	};
}
scServices.dataUtil = {
	serialiseObjJs : function(pObj){
		try{
			return JSON.stringify(pObj);
		} catch(e){
			if(window.console && window.console.log) window.console.log("Cannot serialise Javascript object.");
			return "";
		}
	},
	deserialiseObjJs : function(pString){
		if(!pString) return {};
		try{
			return JSON.parse(pString);
		} catch(e){ // 20220511 TODO: purge in 2027 when there is little chance of non JSON scorm data still around.
			var vVal;
			eval("vVal="+pString);
			return vVal;
		}
	}
}

scServices.distribRecords = {
	fAssmntToUpdate : null,

	assmntMsg : {},

	data : {},

	ltiMgr : null,

	getField: function(area, fields) {
		var vCur = this.data[area];
		if(vCur == null) return null;
		if(fields) for(var i=0, imax=fields.length; i < imax; i++) {
			var vF = vCur[fields[i]];
			if(vF == null) return null;
			vCur = vF;
		}
		return vCur;
	},

	setField : function (area, fields, pVal) {
		if(fields){
			if(this.fAssmntToUpdate) {
				if(!this.fAssmntToUpdate[area]) this.fAssmntToUpdate[area] = {};
				this.fAssmntToUpdate[area][fields[0]] = true;
			}
			if(!this.data[area]) this.data[area] = {}
			var vCur = this.data[area];
			var imax = fields.length-1;
			for(var i=0; i<imax; i++) {
				var vF = vCur[fields[i]];
				if(vF == null) vCur = vCur[fields[i]] = {}; else vCur = vF;
			}
			if( ! (fields[imax] in vCur) || vCur[fields[imax]] !== pVal) {
				vCur[fields[imax]] = pVal;
				return true;
			}
		}
		else {
			this.data[area] = pVal;
			return true;
		}

		return false;
	},

	removeField : function (area, fields) {
		var vCur = this.data[area];
		if(this.fAssmntToUpdate) {
			if(!this.fAssmntToUpdate[area]) this.fAssmntToUpdate[area] = {};
			this.fAssmntToUpdate[area][fields[0]] = true;
		}

		var imax = fields.length-1;
		for(var i=0; i<imax; i++) {
			var vF = vCur[fields[i]];
			if(vF == null) return false;
			vCur = vF;
		}
		if(vCur[fields[imax]]) return delete vCur[fields[imax]];

		return false;
	},

	isDistribRecordsActive : function () {
		if(scServices.scorm2k4 && scServices.scorm2k4.isScorm2k4Active()) return false;
		if(scServices.scorm12 && scServices.scorm12.isScorm12Active()) return false;
		if(!this.init && "ltiMgr" in window.parent) {
			this.ltiMgr = window.parent.ltiMgr;
			this.init = true;
			this.setField("assmnt", null, this.ltiMgr.getAssmnt())
			this.ltiMgr.getAssmntFields().forEach(m=> this.setField("fields",[m.assmntId],m));
			this.ltiMgr.getAssmntSuspendData().forEach(m=> this.setField("suspendData",[m.assmntId],m.content));
			this.fAssmntToUpdate =  {}
		}
  		return this.init;
	},

	synch : function(data){
		if(data === "assmnt") this.ltiMgr.setAssmnt(this.getField("assmnt"));
		else{
			const msgs = [];
			if(this.fAssmntToUpdate[data]){
				Object.keys(this.fAssmntToUpdate[data]).forEach(id=>{
					let msg = this.getField(data, [id]) || {type:"remove"}
					if(data === "suspendData" && msg.type !=="remove") msg = {"content":msg};
					msg.assmntId = id
					msgs.push(msg)
				});
				if(data === "fields") this.ltiMgr.setAssmntFields(msgs);
				else if(data === "suspendData") this.ltiMgr.setAssmntSuspendData(msgs);
				delete this.fAssmntToUpdate[data];
			}
		}
	},

	getLocation : function(){
		return this.assmntMsg.location;
	},
	setLocation : function(pLoc, pSend){
		this.assmntMsg.location = pLoc;
		if(pSend) this.synch("assmnt");
	},
	getCompletionStatus : function () {
		return this.assmntMsg.status;
	},
	setCompletionStatus : function(pStatus,pSend){
		this.assmntMsg.status = pStatus;
		if(pSend) this.synch("assmnt");
	},
	setProgression : function(pProg, pSend){
		this.assmntMsg.progression = pProg;
		if(pSend) this.synch("assmnt");
	},
	setSessionTime : function(pSessionTime, pSend){
		this.assmntMsg.sessionTime = this.assmntMsg.sessionTime||0;
		this.assmntMsg.sessionTime += pSessionTime;
		if(pSend) this.synch("assmnt");
	},
	setExitStatus : function(pExitStatus,pSend){
		this.assmntMsg.exitStatus = pExitStatus;
		if(pSend) this.synch("assmnt");
	},
	setMainScore : function(pScore, pMin, pMax, pSend){
		const vScore = pMin != undefined && pMax != undefined ? (pScore - pMin)/(pMax-pMin):pScore;
		this.assmntMsg.content = vScore;
		if(pSend) this.synch("assmnt");
	},
	getMainScore:function(){
		return this.assmntMsg.content;
	},
	quit:function(){
		this.ltiMgr.endLtiSession();
	}
}

scServices.storage = scOnLoads[scOnLoads.length] = {
	fIsActive : false,
	fIsLocal : false,
	fDomain : document.location.hostname,
	fRootKey : document.location.pathname+"/",
	fStorage : null,
	isStorageActive : function(){return this.fIsActive;},
	activeStorage : function(pBoolean){
		if(!pBoolean) this.fIsActive = false;
		else {
			try {
				if (typeof localStorage != "undefined") {
					this.fStorage = localStorage;
					this.fIsLocal = true;
				} else {
					this.fStorage = globalStorage[this.fDomain];
				}
				this.fIsActive = true;
			}catch(e){
				this.fIsActive = false;
			}
		}
		return this.fIsActive;
	},
	getStorage : function(){return this.fStorage},
	getRootKey : function(){return this.fRootKey},
	setItem : function(pKey,pVal){
		if (!this.isStorageActive) return null;
		return this.fStorage.setItem(pKey, pVal);
	},
	getItem : function(pKey){
		if (!this.isStorageActive) return null;
		var vIt = this.fStorage.getItem(pKey);
		return vIt ? (this.fIsLocal ? vIt : vIt.value) : null;
	},
	resetData : function(pRootKey){
		if (this.fIsLocal){
			this.fStorage.clear();
		} else {
			if(!pRootKey) pRootKey = this.fRootKey;
			var vCnt = this.fStorage.length;
			for(var i = 0; i < vCnt; i++) {
				var vKey = this.fStorage.key(i);
				if(vKey.indexOf(pRootKey)==0) this.fStorage.setItem(vKey, "");
			}
		}
	},
	onLoad: function(){
		if(scServices.scorm2k4 && scServices.scorm2k4.isScorm2k4Active()) return;
		if(scServices.scorm12 && scServices.scorm12.isScorm12Active()) return;
		this.activeStorage(true);
	},
	loadSortKey: "0storage"
}


scServices.assmntMgr = scOnLoads[scOnLoads.length] = scOnUnloads[scOnUnloads.length] = {
	_SendDataOnSave : true,
	setResponse: function(pId, pSession, pField, pValue){
		this.xSetResponse(pId, pSession, pField, pValue);
		if(this._listeners) this.xFireEvent({fId:pId, fSession:pSession, fField:pField, fValue:pValue}, "handleAssmntResponse");
		return pValue;
	},
	resetResponses: function(pId, pSession){
		this.xResetResponses(pId, pSession);
		if(this._listeners) this.xFireEvent({fId:pId, fSession:pSession}, "handleAssmntResponse");
	},
	resetAll: function(){
		this.xResetAll();
		if(this._listeners) this.xFireEvent({}, "handleAssmntResponse");
	},
	setPts: function(pId, pSession, pMin, pScore, pMax){
		this.xSetPts(pId, pSession, pMin, pScore, pMax);
		if(this._listeners) this.xFireEvent({fId:pId, fSession:pSession, fMin:pMin, fScore:pScore, fMax:pMax}, "handleAssmntPts");
	},
	getCompletionStatus: function(pId, pSession){
		return this.xGetCompletionStatus(pId, pSession) || "notAttempt";
	},
	setCompletionStatus: function(pId, pSession, pStatus){
		switch(pStatus) {
			case "attempt" : 
			case "complete" : 
			case "notAttempt" : 
				break;
			default :
				pStatus = "notAttempt";
		}
		this.xSetCompletionStatus(pId, pSession, pStatus);
		if(this._listeners) this.xFireEvent({fId:pId, fSession:pSession, fStatus:pStatus}, "handleAssmntStatus");
		return pStatus;
	},
	setHintsShown: function(pId, pSession, pHintsShown){
		this.xSetHintsShown(pId, pSession, pHintsShown);
		if(this._listeners) this.xFireEvent({fId:pId, fSession:pSession, fHintsShown:pHintsShown}, "handleAssmntHints");
		return pHintsShown;
	},
	
	_listeners : null,
	addEventListener : function (pListerner){
		this._listeners = {l:pListerner, next:this._listeners};
	},
	removeEventListener : function (pListerner){
		var vListener = this._listeners;
		var vPrev = null;
		while(vListener) {
			if(vListener.l === pListerner) {
				if(vPrev) vPrev.next = vListener.next; else this._listeners = vListener.next;
			}
			vPrev = vListener;
			vListener = vListener.next;
		}
	},
	xFireEvent : function (pEvent, pMethod){
		var vListener = this._listeners;
		while(vListener) {
			try{vListener.l[pMethod].call(vListener.l, pEvent)}catch(e){}
			vListener = vListener.next;
		}
	},
	xConnect2k4 : function(){
		this._api = scServices.scorm2k4.getScorm2k4API();
		var vCount = this._api.GetValue("cmi.interactions._count");
		this._interactionsMap = {};
		for(var i = 0; i < vCount; i++) this._interactionsMap[this._api.GetValue("cmi.interactions."+i+".id")] = {idx:i};
		this.xGetStruct = function(pId, pSession, pStruct){
			if(pId==null) return null;
			pSession = pSession ? pSession+"X" : "#"; /* X:protection bug parsers JS (ex: si pSession=eval sur firefox)*/
			var vInterac = this._interactionsMap[pId];
			if(vInterac) {
				if( ! ("session" in vInterac)) try{vInterac.session=scServices.dataUtil.deserialiseObjJs(this._api.GetValue("cmi.interactions."+this._interactionsMap[pId].idx+".learner_response"))}catch(e){vInterac.session={};};
				var vSess = vInterac.session[pSession];
				if(vSess) return vSess[pStruct];
			}
			return null;
		};
		this.xSetStruct = function(pId, pSession, pStruct, pValue){
			if(pId==null) return null;
			pSession = pSession ? pSession+"X" : "#";
			var vInterac = this._interactionsMap[pId];
			if(!vInterac) {
				vInterac = {};
				vInterac.session = {};
				this._interactionsMap[pId] = vInterac;
			} else if( ! ("session" in vInterac)) try{vInterac.session=scServices.dataUtil.deserialiseObjJs(this._api.GetValue("cmi.interactions."+this._interactionsMap[pId].idx+".learner_response"))}catch(e){vInterac.session={};};
			vInterac.updated = true;
			if(! (pSession in vInterac.session))vInterac.session[pSession] = {};
			vInterac.session[pSession][pStruct] = pValue;
		};
		this.xSynch = function(){
			for(var vId in this._interactionsMap) {
				var vInterac = this._interactionsMap[vId];
				if(vInterac.updated) {
					try {
					if(! ("idx" in vInterac)) {
						vInterac.idx = this._api.GetValue("cmi.interactions._count");
						this._api.SetValue("cmi.interactions."+vInterac.idx+".id", vId);
						this._api.SetValue("cmi.interactions."+vInterac.idx+".type", "other");
					}
					this._api.SetValue("cmi.interactions."+vInterac.idx+".learner_response", scServices.dataUtil.serialiseObjJs(vInterac.session));
					}catch(e){}
					vInterac.updated = false;
				}
			}
		};
		// Enregistrement des données
		this.commit = function(pForceSendData){
			var vMustSendData = pForceSendData!=undefined ?  pForceSendData : this._SendDataOnSave;
			this.xSynch(); 
			if(vMustSendData) this._api.Commit("");
		};
		this.getResponse = function(pId, pSession, pField){var vStruct = this.xGetStruct(pId, pSession, "r"); return vStruct ? vStruct[pField] : null;};
		this.xSetResponse = function(pId, pSession, pField, pValue){var vStruct = this.xGetStruct(pId, pSession, "r") || {}; vStruct[pField] = pValue; this.xSetStruct(pId, pSession, "r", vStruct);};
		this.xResetResponses = function(pId, pSession){this.xSetStruct(pId, pSession, "r", {});};
		this.xResetAll = function(){
			for (var vId in this._interactionsMap){
				var vInterac = this._interactionsMap[vId];
				vInterac.updated = true;
				for (var vSession in vInterac.session)
					vInterac.session[vSession]={};
			} 
		};
		this.getMinPts = function(pId, pSession){return this.xGetStruct(pId, pSession, "i");};
		this.getScorePts = function(pId, pSession){return this.xGetStruct(pId, pSession, "s");};
		this.getMaxPts = function(pId, pSession){return this.xGetStruct(pId, pSession, "a");};
		this.xSetPts = function(pId, pSession, pMin, pScore, pMax){this.xSetStruct(pId, pSession, "i", pMin); this.xSetStruct(pId, pSession, "s", pScore); this.xSetStruct(pId, pSession, "a", pMax);};
		this.xGetCompletionStatus = function(pId, pSession){return this.xGetStruct(pId, pSession, "st");};
		this.xSetCompletionStatus = function(pId, pSession, pStatus){this.xSetStruct(pId, pSession, "st", pStatus);};
		this.getHintsShown = function(pId, pSession){return this.xGetStruct(pId, pSession, "h");};
		this.xSetHintsShown = function(pId, pSession, pHintsShown){this.xSetStruct(pId, pSession, "h", pHintsShown);};
	},
	xConnect12 : function(){
		this.commit = function(pForceSendData){scServices.suspendDataStorage.commit(pForceSendData);};
		this.xSynch = function(){};
		this.getResponse = function(pId, pSession, pField){return scServices.suspendDataStorage.getVal(["assmnt", pSession ? pSession+"X" : "#", pId, "r", pField]);};
		this.xSetResponse = function(pId, pSession, pField, pValue){scServices.suspendDataStorage.setVal(["assmnt", pSession ? pSession+"X" : "#", pId, "r", pField], pValue);};
		this.xResetResponses = function(pId, pSession){scServices.suspendDataStorage.removeVal(["assmnt", pSession ? pSession+"X" : "#", pId, "r"]);};
		this.xResetAll = function(){scServices.suspendDataStorage.removeVal(["assmnt"])};
		this.getMinPts = function(pId, pSession){return scServices.suspendDataStorage.getVal(["assmnt", pSession ? pSession+"X" : "#", pId, "i"]);};
		this.getScorePts = function(pId, pSession){return scServices.suspendDataStorage.getVal(["assmnt", pSession ? pSession+"X" : "#", pId, "s"]);};
		this.getMaxPts = function(pId, pSession){return scServices.suspendDataStorage.getVal(["assmnt", pSession ? pSession+"X" : "#", pId, "a"]);};
		this.xSetPts = function(pId, pSession, pMin, pScore, pMax){scServices.suspendDataStorage.setVal(["assmnt", pSession ? pSession+"X" : "#", pId, "i"], pMin); scServices.suspendDataStorage.setVal(["assmnt", pSession ? pSession+"X" : "#", pId, "s"], pScore); scServices.suspendDataStorage.setVal(["assmnt", pSession ? pSession+"X" : "#", pId, "a"], pMax); };
		this.xGetCompletionStatus = function(pId, pSession){return scServices.suspendDataStorage.getVal(["assmnt", pSession ? pSession+"X" : "#", pId, "st"]);};
		this.xSetCompletionStatus = function(pId, pSession, pStatus){scServices.suspendDataStorage.setVal(["assmnt", pSession ? pSession+"X" : "#", pId, "st"], pStatus);};
		this.getHintsShown = function(pId, pSession){return scServices.suspendDataStorage.getVal(["assmnt", pSession ? pSession+"X" : "#", pId, "h"]);};
		this.xSetHintsShown = function(pId, pSession, pHintsShown){scServices.suspendDataStorage.setVal(["assmnt", pSession ? pSession+"X" : "#", pId, "h"], pHintsShown);};
	},
	xConnectDistrib : function(){
		this.commit = function(pForceSendData){scServices.distribRecords.synch("assmnt"); scServices.distribRecords.synch("fields");};
  	this.xSynch = function(){scServices.distribRecords.synch("assmnt"); scServices.distribRecords.synch("fields");};
  	this.getResponse = function(pId, pSession, pField){return scServices.distribRecords.getField("fields", this.xGetFields(pId,pSession,["r",pField]));};
  	this.xSetResponse = function(pId, pSession, pField, pValue){scServices.distribRecords.setField("fields", this.xGetFields(pId,pSession,["r",pField]),pValue);};
  	this.xResetAll = function(){Object.keys(scServices.distribRecords.getField("fields")).forEach(id => scServices.distribRecords.removeField("fields", id));};
  	this.xResetResponses = function(pId, pSession) {scServices.distribRecords.removeField("fields", this.xGetFields(pId,pSession,"r"));}
  	this.getMinPts = function(pId, pSession){return scServices.distribRecords.getField("fields", this.xGetFields(pId,pSession,"mi"));};
  	this.getScorePts = function(pId, pSession){return scServices.distribRecords.getField("fields", this.xGetFields(pId,pSession,"sc"));};
  	this.getMaxPts = function(pId, pSession){return scServices.distribRecords.getField("fields", this.xGetFields(pId,pSession,"ma"));};
  	this.xSetPts = function(pId, pSession, pMin, pScore, pMax){ scServices.distribRecords.setField("fields", this.xGetFields(pId,pSession,"mi"),pMin); scServices.distribRecords.setField("fields",this.xGetFields(pId,pSession,"sc"),pScore); scServices.distribRecords.setField("fields", this.xGetFields(pId,pSession,"ma"),pMax); this.xSetScore(pId,pSession, pMin, pScore, pMax);};
  	this.xGetCompletionStatus = function(pId, pSession){ scServices.distribRecords.getField("fields", this.xGetFields(pId,pSession,"st")); };
  	this.xSetCompletionStatus = function(pId, pSession, pStatus){ scServices.distribRecords.setField("fields", this.xGetFields(pId,pSession,"st"),pStatus);};
  	this.getHintsShown = function(pId, pSession){ scServices.distribRecords.getField("fields", this.xGetFields(pId,pSession,"hi")); return this.xGetDatas(pId,pSession).hi;};
  	this.xSetHintsShown = function(pId, pSession, pHintsShown){"fields", scServices.distribRecords.setField("fields", this.xGetFields(pId,pSession,"hi"), pHintsShown);};
  	this.xInitData = function(){};
  	this.xGetFields = function(pId,pSession,pFields){
  		const vFields = Array.isArray(pFields)?pFields:[pFields];
  		return [pId,"data",pSession || '#'].concat(vFields);
  	}
  	this.xSetScore = function(pId, pSession, pMin, pScore, pMax){
  		if(!pMax || !pMin || !pScore) return;
  		const vScore = (pScore - pMin) / (pMax - pMin);
  		scServices.distribRecords.setField("fields",[pId,pSession||"#","content"],vScore);
  	}
  },
	xConnectNone : function(){
		this.commit = function(pForceSendData){};
		this.xSynch = function(){};
		this.getResponse = function(pId, pSession, pField){return this.data.resp[pSession+"."+pId+"."+pField];};
		this.xSetResponse = function(pId, pSession, pField, pValue){this.data.resp[pSession+"."+pId+"."+pField] = pValue;};
		this.xResetAll = function(){this.xInitData();};
		this.xResetResponses = function(pId, pSession){var vRegexp = new RegExp("^"+pSession+"\\."+pId+".*"); for(var vK in this.data.resp) if(vRegexp.test(vK)) delete this.data.resp[vK]};
		this.getMinPts = function(pId, pSession){return this.data.minPts[pSession+"."+pId];};
		this.getScorePts = function(pId, pSession){return this.data.scorePts[pSession+"."+pId];};
		this.getMaxPts = function(pId, pSession){return this.data.maxPts[pSession+"."+pId];};
		this.xSetPts = function(pId, pSession, pMin, pScore, pMax){this.data.minPts[pSession+"."+pId] = pMin; this.data.scorePts[pSession+"."+pId] = pScore; this.data.maxPts[pSession+"."+pId] = pMax;};
		this.xGetCompletionStatus = function(pId, pSession){return this.data.status[pSession+"."+pId];};
		this.xSetCompletionStatus = function(pId, pSession, pStatus){this.data.status[pSession+"."+pId] = pStatus;};
		this.getHintsShown = function(pId, pSession){return this.data.hints[pSession+"."+pId];};
		this.xSetHintsShown = function(pId, pSession, pHintsShown){this.data.hints[pSession+"."+pId] = pHintsShown;};
		this.xInitData = function(){try{this.data = {resp:{},scorePts:{},minPts:{},maxPts:{},status:{},hints:{}};} catch(e){}};
		this.xInitData();
	},
	xConnectStorage : function(){
		this.xConnectNone();
		this.reloadData = function(){try{this.xInitData();var vItem=scServices.storage.getItem(scServices.storage.getRootKey()+"assmnt");if(vItem) this.data=scServices.dataUtil.deserialiseObjJs(vItem);} catch(e){}};
		this.xInitData = function(){this.data={resp:{},scorePts:{},minPts:{},maxPts:{},status:{},hints:{}}};
		this.commit = function(pForceSendData){scServices.storage.getStorage().setItem(scServices.storage.getRootKey()+"assmnt", scServices.dataUtil.serialiseObjJs(this.data))};	
		this.reloadData();
	},
	/* interne */
	onLoad: function(){
		if(scServices.scorm2k4 && scServices.scorm2k4.isScorm2k4Active()) this.xConnect2k4();
		else if(scServices.scorm12 && scServices.scorm12.isScorm12Active() && scServices.suspendDataStorage) this.xConnect12();
		else if(scServices.distribRecords && scServices.distribRecords.isDistribRecordsActive()) this.xConnectDistrib();
		else if(scServices.storage && scServices.storage.isStorageActive()) this.xConnectStorage();
		else this.xConnectNone();
	},
	loadSortKey: "2assmntMgr",
	onUnload: function(){
		this.xSynch();
	},
	unloadSortKey: "2assmntMgr"
};
