const tePlayerMgr = {
	subControllers : [],

	init: async function () {
		await teLoader.docInteractive;
		const playerElems = document.querySelectorAll('.tePlayer');
		if (playerElems.length) {
			await teLoader.loadTeScripts(teLoader.teScripts);
			for (const playerElem of playerElems) {
				await teLoader.initMediaElement(playerElem.querySelector('audio,video'));
				this.initController(playerElem.querySelector('.tepController'));
			}
		}
	},

	initController: function(ctrlElt) {
		teMgr.initController(ctrlElt, this.subControllers.concat([
			new TEActiveMouse(1500),
			new TEFullscreenCtrl('.tepFullscreen'),
			new TEOnlyOnePlayingCtrl(),
			new TESettingsFromTracks('tep', '.tepFullscreen'),
			new TEErrorHandler(),
			new TESessionCurrentSubtitle('.tepSubtitlesList')
		]));
	}
};
