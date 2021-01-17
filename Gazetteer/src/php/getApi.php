<?php
	$executionStartTime = microtime(true) / 1000;
	$url = null;
	$ch = null;
	$result = null;


	$countriesData = json_decode(file_get_contents("../js/countryBorders.geo.json"), true);
	$countries = [];
	$airportsData = json_decode(file_get_contents("../js/airports.json"), true);

	// DATA FOR SELECT OPTIONS
	foreach ($countriesData['features'] as $feature) {
		$temp = null;
		$temp['code'] = $feature['properties']['iso_a2'];
		$temp['name'] = $feature['properties']['name'];
		array_push($countries, $temp);
	}

	// SORTED DATA FOR SELECT OPTIONS
	usort($countries, function ($item1, $item2) {
		return $item1['name'] <=> $item2['name'];
	});

	// FIRST CALL BASED ON LAT/LON FROM navigator.geolocation
	$countryCodeFirstCall = null;

	if(isset($_REQUEST['lat']) && isset($_REQUEST['lon'])) {
		$url = 'http://api.geonames.org/countryCodeJSON?formatted=true&lat=' . $_REQUEST['lat'] . '&lng=' . $_REQUEST['lon'] . '&username=usba30&style=full';
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_URL,$url);
		$result=curl_exec($ch);
		curl_close($ch);
		$countryCodeFirstCall = json_decode($result, true);
	} else {
		$countryCodeFirstCall = null;
	}

	// GET REST COUNTRIES API
	if($countryCodeFirstCall){
		$url = 'https://restcountries.eu/rest/v2/alpha/' . $countryCodeFirstCall['countryCode'];
	} else {
		$url = 'https://restcountries.eu/rest/v2/alpha/' . $_REQUEST['countryCode'];
	}

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);
	$result=curl_exec($ch);
	curl_close($ch);
	$countryInfo = json_decode($result, true);

	// GET GEOJSON FOR COUNTRY
	foreach ($countriesData['features'] as $feature) {
		if ($feature['properties']['iso_a2'] == $countryInfo['alpha2Code']) {
			$countryInfo['geoJSON'] = $feature;
		}
	}

	// GET CITIES OF COUNTRY
	$url = 'http://api.geonames.org/searchJSON?username=usba30&country=' . $countryInfo['alpha2Code'] . '&maxRows=10&style=SHORT';
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);
	$result=curl_exec($ch);
	curl_close($ch);
	$countryCitiesData = json_decode($result, true);

	$countryCities = [];

	// continue city with same name as capital of country
	foreach ($countryCitiesData['geonames'] as $city) {
		if ($city['name'] != $countryInfo['name'] && $city['name'] != $countryInfo['nativeName']) {
			array_push($countryCities, $city);
		}
	}

	// GET CAPITAL OF COUNTRY
	$url = 'http://api.geonames.org/searchJSON?formatted=true&q=' . $countryInfo['capital'] . '&maxRows=1&username=usba30&style=SHORT';
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);
	$result=curl_exec($ch);
	curl_close($ch);
	$countryCapital = json_decode($result, true);

	// REMOVE CAPITAL FROM CITIES LIST
	$capitalIndexInCountryCities = 0;
	foreach ($countryCities as $city) {
		if ($city['name'] == $countryCapital['geonames'][0]['name']) {
			array_splice($countryCities, $capitalIndexInCountryCities, 1);
		}
		$capitalIndexInCountryCities++;
	}

	// GET DATA FOR COUNTRY AIRPORTS - Limit 5
	$countryAirports = [];
	$iterator = 5;
	foreach ($airportsData as $key => $value) {
		if ($value['country'] == $countryInfo['alpha2Code'] && $iterator != 0) {
			array_push($countryAirports, $value);
			$iterator--;
		}
	}
	
	// GET DATA FOR COUNTRY BORDERS
	$countryBorders = [];
	foreach ($countriesData['features'] as $feature) {
		foreach ($countryInfo['borders'] as $border) {
			if ($border == $feature['properties']['iso_a2'] || $border == $feature['properties']['iso_a3']) {
				$temp = null;
				$temp['name'] = $feature['properties']['name'];
				$temp['iso_a2'] = $feature['properties']['iso_a2'];
				$temp['iso_a3'] = $feature['properties']['iso_a3'];
				$temp['geometry'] = $feature['geometry'];
				array_push($countryBorders, $temp);
			}
		}
	}

	// GET WEATHER API
	$url = 'api.openweathermap.org/data/2.5/weather?lat=' . $countryInfo['latlng'][0] . '&lon=' . $countryInfo['latlng'][1] . '&appid=361d4bc0b87b5c92c3c6af0a469b4726';
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);
	$result=curl_exec($ch);
	curl_close($ch);
	$countryWeather = json_decode($result, true);

	// GET COVID API
	$ch = curl_init();
	curl_setopt_array($ch, [
		CURLOPT_URL => 'https://covid-19-data.p.rapidapi.com/report/country/code?date=2020-04-01&code=' . $countryInfo['alpha2Code'],
		CURLOPT_RETURNTRANSFER => true,
		CURLOPT_FOLLOWLOCATION => true,
		CURLOPT_ENCODING => "",
		CURLOPT_MAXREDIRS => 10,
		CURLOPT_TIMEOUT => 30,
		CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
		CURLOPT_CUSTOMREQUEST => "GET",
		CURLOPT_HTTPHEADER => [
			"x-rapidapi-host: covid-19-data.p.rapidapi.com",
			"x-rapidapi-key: daa7ee2a87msh861d758ab34161dp13b896jsnf24e51ae2d31"
		],
	]);

	$result = curl_exec($ch);
	curl_close($ch);
	$countryCovidStatistics = json_decode($result, true);
	
	// GET EXCHANGE RATES API
	$url = 'https://openexchangerates.org/api/latest.json?app_id=4a5a00d2c6e94fd2840b83e25646f3cf';
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_URL,$url);
	$result=curl_exec($ch);
	curl_close($ch);
	$exchangeRatesData = json_decode($result, true);

	$countryExchangeRates = null;

	foreach ($exchangeRatesData['rates'] as $key => $value) {
		if ($key == $countryInfo['currencies'][0]['code']) {
			$countryExchangeRates = $value;
		}
	}


	$output['status']['code'] = "200";
	$output['status']['name'] = "ok";
	$output['status']['description'] = "mission saved";
	$output['status']['returnedIn'] = (microtime(true) - $executionStartTime) / 1000 . " ms";

	$output['data']['countries'] = $countries;
	$output['data']['countryInfo'] = $countryInfo;
	$output['data']['countryCities'] = $countryCities;
	$output['data']['countryCapital'] = $countryCapital['geonames'][0];
	$output['data']['countryWeather'] = $countryWeather;
	$output['data']['countryBorders'] = $countryBorders;
	$output['data']['countryAirports'] = $countryAirports;
	$output['data']['countryCovidStatistics'] = $countryCovidStatistics[0]['provinces'][0];
	$output['data']['countryExchangeRates'] = $countryExchangeRates;

	header('Content-Type: application/json; charset=UTF-8');
	echo json_encode($output); 
?>
