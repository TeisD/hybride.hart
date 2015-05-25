var app = {
	mode: null,
    initialize: function() {
        this.bindEvents();
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
    	wifi.sensitivity = $(".sensitivity").val();
    	$(".sensitivity").change(function() {
    	    wifi.sensitivity = $(this).val();
    	    $(".sensitivity_value").html(wifi.sensitivity);
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
	sensitivity: 0,
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
	
			// mag het veranderen
			// ja -> verhoog hartslag met 5
			if(wifi.previous + wifi.previous/wifi.sensitivity <= q || wifi.previous - wifi.previous/wifi.sensitivity >= q){
				if(heartbeat.rate.target < 180){
					var target = heartbeat.rate.target + 10;
					if(target > 180){
						heartbeat.rate.target = 180;
					} else{
						heartbeat.rate.target = target;
					}
				}
				wifi.steady = 0;
			// nee -> stabiliseer
			} else{
				if(heartbeat.rate.target > 60){
					var target = heartbeat.rate.target - (5 + 5 * wifi.steady);
					if(target < 60){
						heartbeat.rate.target = 60;
					} else{
						heartbeat.rate.target = target;
					}
				}
				wifi.steady++;
			}
			
			$(".w").html("#: " + q + "<br />∆: " + Math.abs(q - wifi.previous) + "<br />steady: " + wifi.steady);
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
		if(heartbeat.rate.current <= heartbeat.rate.target - heartbeat.rate.speed){ // if it's lower than the target rate: go up
			heartbeat.rate.current += heartbeat.rate.speed;
		} else if(heartbeat.rate.current >= heartbeat.rate.target + heartbeat.rate.speed){ // if it's higher, get down
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