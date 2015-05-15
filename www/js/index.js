var mode = {
	ABSOLUTE: "absolute",
	ABSOLUTE_WITH_SPEED: "absolute_with_speed",
	RELATIVE: "relative"
}

var app = {
	mode: null,
    initialize: function() {
        this.bindEvents();
        if($('.withspeed').is(':checked')){
        	app.mode = mode.ABSOLUTE_WITH_SPEED;
        } else{
        	app.mode = mode.ABSOLUTE;
        }
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function() {
    	window.plugins.insomnia.keepAwake();
    	app.updateStatus('Checking if wifi is turned on...', 'img/wifi.png', 'blink');
    	WifiWizard.isWifiEnabled(function(data){
    		// if turned off
    		if(!data){
    	    	app.updateStatus('WiFi is turned off', 'img/wifi.png', 'load');
    	    	navigator.notification.confirm(
	    		    'To use this application your phone\'s wifi should be turned on', // message
	    		     onConfirm,            // callback to invoke with index of button pressed
	    		    'Wifi is turned off',           // title
	    		    ['Turn on wifi','Cancel']     // buttonLabels
	    		);
    		} else{
    			wifi.start();
    	    	heartbeat.start();
    		}
    	}, function(){
    		$(".content").html("Could not check wifi status", "img/error.png", "load");
    	});
    	function onConfirm(buttonIndex){
    		if(buttonIndex == 1){ // yes
		    	app.updateStatus('Turning on wifi...', 'img/wifi.png', 'blink');
    			WifiWizard.setWifiEnabled(true, function(data){
    		    	// wait a little bit
    				setTimeout(app.onDeviceReady, 10000);
    			}, function(data){
    				app.updateStatus("Wifi could not be turned on", "img/error.png", "none");
    			});
    		}
    	}
    	$(".withspeed").change(function() {
    	    if(this.checked) {
    	        app.mode = mode.ABSOLUTE_WITH_SPEED;
    	    } else{
    	    	app.mode = mode.ABSOLUTE;
    	    }
    	});
    	$(".status").on("touchend", function(){
    		$(".content").toggle();
    		$(".dev").toggle();
    	})
    },
    // Update DOM on a Received Event
    updateStatus: function(msg, img, c) {
        $(".status p").html(msg);
        /*
        if(bg !== "" && bg !== "undefined" && bg !== null){
	        if(bg != false){
	        	cordova.plugins.backgroundMode.configure({
		        	text: msg
		        });
	        }
        }*/
        if(img !== "" && img !== "undefined" && img !== null){
        	$(".status img").attr("src", img);
        }
        if(c !== "" && c !== "undefined" && c !== null){
        	$(".status img").removeClass();
        	$(".status img").addClass(c);
        }
    }

};

var wifi = {
	scanning: false,
	previous: 0,
	steady: 0,
	start: function(){
		if(!wifi.scanning){
			// check for access points once, so previous is populated
			$(".w").html("run first scan");
			navigator.wifi.getAccessPoints(function(data){
				wifi.previous = Object.size(data);
				wifi.scanning = true;
				$(".w").html("first scan done");
				wifi.scan();
			}, function(){
				//error
			});
		}
	},
	scan: function(){
		navigator.wifi.getAccessPoints(function(data){
			var q = Object.size(data);
			var diff = Math.abs(q - wifi.previous);
	
			switch(app.mode){
			case mode.ABSOLUTE:
				// stable
				if(q - wifi.previous == 0){
					if(heartbeat.rate.target > 60){
						heartbeat.rate.speed = 2;
						var target = heartbeat.rate.target -= 10 + 10 * wifi.steady;
						if(target < 60){
							heartbeat.rate.target = 60;
						} else{
							heartbeat.rate.target = target;
						}
					}
					wifi.steady++;
				// change
				} else{
					if(heartbeat.rate.target < 180){
						heartbeat.rate.speed = 2;
						var target = heartbeat.rate.target + diff * 5;
						if(target > 180){
							heartbeat.rate.target = 180;
						} else{
							heartbeat.rate.target = target;
						}
					}
					wifi.steady = 0;
				}
				break;
			// deprecated
			case mode.ABSOLUTE_WITH_SPEED:
				if(q - wifi.previous == 0){
					heartbeat.rate.speed = 2;
					if(heartbeat.rate.target > 60){
						if(heartbeat.rate.target >= 70){
							heartbeat.rate.target -= 10;
						} else{
							heartbeat.rate.target = 60;
						}
					}
				} else{
					if(heartbeat.rate.target < 180){
						heartbeat.rate.target += diff * 10;
						heartbeat.rate.speed = diff * 2;
					}
				}
				break;
			}
			
			$(".w").html("mode: "+ app.mode + "<br />#: " + q + "<br />∆: " + Math.abs(q - wifi.previous) + "<br />steady: " + wifi.steady);
			wifi.previous = q;
			
			if(wifi.scanning){
				setTimeout(wifi.scan, 1000);
			}
		}, function(){
			//$(".status").html("error!");
			if(wifi.scanning){
				setTimeout(wifi.scan, 1000);
			}
		});
	},
	stop: function(){
		clearInterval(wifi.timer);
	}
};


var heartbeat = {
	timer: null,
	beating: false,
	rate: {
		current: 60,
		target: 60,
		speed: 2
	},
	start: function(){
		if(!heartbeat.beating){
    		app.updateStatus("", "img/heart.png", "blink")
			heartbeat.beating = true;
			heartbeat.beat();
			heartbeat.timer = setInterval(heartbeat.change, 1000); //speed up or down every second
		}
	},
	stop: function(){
		heartbeat.beating = false;
		clearInterval(timer);
	},
	restart: function(){
		heartbeat.stop();
		heartbeat.start();
	},
	beat: function(){
		if(heartbeat.beating){
			console.log("beat");
			var interval = 1000 / (heartbeat.rate.current / 60); // from BPM to interval
			navigator.vibrate([60, interval/(6+(interval/500)), 50]);
			setTimeout(heartbeat.beat, interval);
			$(".s").html("<p>current: " + heartbeat.rate.current + "<br />target: " + heartbeat.rate.target + "<br />speed: " + heartbeat.rate.speed);
		}
	},
	change: function(){
		if(heartbeat.rate.current < heartbeat.rate.target - 0.1){ // if it's lower than the target rate: go up (-0.1 to stabelize in the end)
			if(heartbeat.rate.current + heartbeat.rate.speed > heartbeat.rate.target){// if it's getting close to the ceiling, go a little bit slower
				heartbeat.rate.speed /= 2;
			}
			heartbeat.rate.current += heartbeat.rate.speed;
		} else if(heartbeat.rate.current > heartbeat.rate.target + 0.1){ // if it's higher, get down
			if(heartbeat.rate.current - heartbeat.rate.speed < heartbeat.rate.target){// if it's getting close to the bottom, go a little bit slower
				heartbeat.rate.speed /= 2;
			}
			heartbeat.rate.current -= heartbeat.rate.speed;
		}
	}
}

// helper functions
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function average(obj){
	var avg = 0;
	for(var i = 0; i < obj.length; i++){
		avg += obj[i];
	}
	avg = avg/obj.length;
	return avg;
}

//wait for JQuery to load
$(document).ready(function(){
	app.initialize();
});