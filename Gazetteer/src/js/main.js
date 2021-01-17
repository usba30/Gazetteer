$(window).on('load', function() {
  const countryFormSelect = $('.form-select');

  const btnShowButtons = $('.switch-btn');
  const btnShowMarkers = $('.btn-markers-switch');
  const btnShowBorders = $('.btn-borders-switch');
  const btnContainer = $('.country-info-btn-group, .controls-btn-group');

  const countryName = $('.country-name');
	const countryFlag =	$('.flag-icon img');
  const countryContinent = $('.continent');
  const countryCapital = $('.capital');
  const countryLanguage = $('.language');
  const countryPopulation = $('.population');
  const countryArea = $('.area');
  const countryTemperature = $('.temperature');
  const countryTemperatureFeels = $('.temperature-feels');
  const countryPressure = $('.pressure');
  const countryWind = $('.wind');
  const countrySunrise = $('.sunrise');
  const countrySunset = $('.sunset');
  const countryCovidActive = $('.active');
  const countryCovidConfirmed = $('.confirmed');
  const countryCovidRecovered = $('.recovered');
  const countryCovidDeaths = $('.deaths');
  const countryCurrency = $('.currency');
  const countryUsdRates = $('.usd-rates');
  
  const modalErrorMessage = $('#modal-error-message');
  const preloader = $('#preloader');

  let map = L.map('map', {zoomControl: false}).setView([0, 0], 4);
  let globalData = null;
  let markers = null;
  let countryGeoJSON = null;
  let featureBorders = null;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  navigator.geolocation.getCurrentPosition(function({ coords: { latitude, longitude }}) {
    loadSpinner();
		callApi({lat: latitude, lon: longitude})
  });




  
	countryFormSelect.on('change', function() {
		loadSpinner();

		let selectedCountry = $(this).val();

		callApi({countryCode: selectedCountry});
	});

  btnShowButtons.click(switchButtonsView);

  btnShowMarkers.click(function() {
    switchCountryMarkersView();
    switchAnimateMarkersBtn();
  });

  btnShowBorders.click(function() {
    switchBordersGeoJSONView();
    switchAnimateBordersBtn();
  });




	function callApi(data) {
		$.ajax({
      url: "src/php/getApi.php",
      type: 'POST',
      dataType: 'json',
      data: data,
      success: function({
        status, 
        data : { 
          countries, 
          countryInfo, 
          countryWeather, 
          countryCities, 
          countryCapital, 
          countryAirports, 
          countryCovidStatistics, 
          countryExchangeRates, 
          countryBorders
        }
      }) {
        if (status.name == "ok") {
          stopLoadSpinner();
          
          renderSelectData(countries);

          if(countryFormSelect.val() === null) {
            renderFirstSelect(countryInfo);
          }

          renderInfoData(countryInfo);
          renderWeatherData(countryWeather);
          renderCovidData(countryCovidStatistics);
          renderCurrencyData(countryInfo, countryExchangeRates);
          renderBordersData(countryBorders);
          
          if(countryGeoJSON != null) {
            clearCountryLeafletData();
          }

          
          renderCountryGeoJSON(countryInfo);

          setCountryMapLocation();
          
          renderCountryMarkers(countryCities, countryCapital, countryAirports);
          
          renderBordersGeoJSON(countryBorders);
          
          switchAnimateMarkersBtn();
          
          if(countryBorders.length > 0) {
            btnShowBorders.parent().show();
            switchAnimateBordersBtn();
          } else {
            btnShowBorders.parent().hide();
            switchAnimateBordersBtn();
          }

          globalData = {
            countryInfo,
            countryCities,
            countryCapital,
            countryAirports,
            countryBorders,
          }
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        showErrorInformation();
      }
    });
	}




  function clearCountryLeafletData() {
    if (countryGeoJSON != null) {
      map.removeLayer(countryGeoJSON);
    }
    
    if (markers != null) {
      map.removeLayer(markers);
      switchAnimateMarkersBtn();
    }

    if (featureBorders != null) {
      map.removeLayer(featureBorders);
      switchAnimateBordersBtn();
    }
  } 

  function setCountryMapLocation() {
    map.flyToBounds(countryGeoJSON.getBounds(), {animate: true, duration: 1.5});
  }

	function renderCountryGeoJSON(countryInfoData) {
    countryGeoJSON = L.geoJSON(countryInfoData.geoJSON).bindPopup(`${countryInfoData.name} <a href="https://en.wikipedia.org/wiki/${countryInfoData.name}" target="_blank">more</a>`).addTo(map);

    map.fitBounds(countryGeoJSON.getBounds());
  }
  
  function renderCountryMarkers(countryCitiesData, countryCapitalData, countryAirportsData) {
    let cityIcon = L.icon({
      iconUrl: './src/images/city.png',
      iconAnchor: [30, 12]
    })
    
    let capitalIcon = L.icon({
      iconUrl: './src/images/crown.png',
      iconAnchor: [25, 15]
    });

    let airportIcon = L.icon({
      iconUrl: './src/images/airport.png',
      iconAnchor: [21, 7]
    })


    markers = new L.MarkerClusterGroup();

    const capitalMarker = L.marker([countryCapitalData.lat, countryCapitalData.lng], {icon: capitalIcon}).bindPopup(`${countryCapitalData.name} <a href="https://en.wikipedia.org/wiki/${countryCapitalData.name}" target="_blank">more</a>`); 

    markers.addLayer(capitalMarker);

    countryCitiesData.forEach(city => {
      const cityMarker = L.marker([city.lat, city.lng], {icon: cityIcon}).bindPopup(`${city.name} <a href="https://en.wikipedia.org/wiki/${city.name}" target="_blank">more</a>`);
      markers.addLayer(cityMarker);
    });

    countryAirportsData.forEach(airport => {
      const airportMarker = L.marker([airport.lat, airport.lon], {icon: airportIcon}).bindPopup(`${airport.name} <a href="https://en.wikipedia.org/wiki/${airport.name}" target="_blank">more</a>`);
      markers.addLayer(airportMarker);
    });

    map.addLayer(markers);
  }

  function renderBordersGeoJSON(countryBordersData) {
    const countryBordersGeoJSON = [];

    countryBordersData.forEach(border => {
      const borderGeoJSON = L.geoJSON(border.geometry, {style: {
        color: 'rgba(255, 0, 0, .5)',
        weight: '1',
      }}).bindPopup(`${border.name} <a href="https://en.wikipedia.org/wiki/${border.name}" target="_blank">more</a>`);
      countryBordersGeoJSON.push(borderGeoJSON);
    });
    
    featureBorders = L.featureGroup(countryBordersGeoJSON).addTo(map);
  }
  
  function switchCountryMarkersView() {
    if(markers != null) { 
      map.removeLayer(markers);
      markers = null;
    } else {
      renderCountryMarkers(globalData.countryCities, globalData.countryCapital, globalData.countryAirports);
    }

  }

  function switchBordersGeoJSONView() {
    if(featureBorders != null) { 
      map.removeLayer(featureBorders);
      featureBorders = null;
    } else {
      renderBordersGeoJSON(globalData.countryBorders);

      if(map.getZoom() > 5) {
        map.setView([globalData.countryInfo.latlng[0], globalData.countryInfo.latlng[1]], 4);
      }
    }
  }




  function renderSelectData(data) {
    data.forEach(el => {
      $('<option />', {
        value: el.code,
        text: el.name
      }).appendTo(countryFormSelect);
    })
  }

  function renderFirstSelect(data) {
    $('.form-select').val(data.alpha2Code);
  }

  function renderInfoData(data) {
		countryName.html(`${data.name}`);
		countryFlag.attr('src', data.flag);
    countryContinent.html(`${data.region}`);
    countryCapital.html(`${data.capital}`);
    countryLanguage.html(`${data.languages[0].name}`);
    countryPopulation.html(`${numeral(data.population).format('0,0')}`);
    countryArea.html(`${numeral(data.area).format('0,0')} km<sup>2</sup>`);
  }

  function renderWeatherData(data) {
    const sunrise = calcTimestamp(data.sys.sunrise);
    const sunset = calcTimestamp(data.sys.sunset);
    countryTemperature.html(`${data.main.temp} K`);
    countryTemperatureFeels.html(`${data.main.feels_like} K`);
    countryPressure.html(`${data.main.pressure} hPa`);
    countryWind.html(`${data.wind.speed} mph`);
    countrySunrise.html(`${sunrise}`);
    countrySunset.html(`${sunset}`);
  }

  function renderCovidData(data) {
    countryCovidActive.html(`${numeral(data.active).format('0,0')}`);
    countryCovidConfirmed.html(`${numeral(data.confirmed).format('0,0')}`);
    countryCovidRecovered.html(`${numeral(data.recovered).format('0,0')}`);
    countryCovidDeaths.html(`${numeral(data.deaths).format('0,0')}`);
  }

  function renderCurrencyData(data, rate) {
    countryCurrency.html(`${data.currencies[0].code}`);
    countryUsdRates.html(`${rate}`);
  }

  function renderBordersData(data) {
		$('#country-borders-modal .modal-details-group').remove();

    data.forEach(border => {
      let $wrapper = $('<div>', {
        'class' : 'modal-details-group'
      }).appendTo($('#country-borders-modal .modal-body'));
  
      $('<i>', {
        'class' : 'far fa-handshake'
      }).appendTo($wrapper);
  
      $('<span>', {
        'text' : border.name
      }).appendTo($wrapper);
    });
  }

  function calcTimestamp(data) {
    const fullDate = new Date(data * 1000).toString();

    const dateArray = fullDate.split(' ');

    const dateTime = dateArray[4];
    const dateZone = dateArray[5];

    const result = dateTime + ' ' + dateZone.substring(0, 4) + '1'; 

    return result;
  }

  function switchButtonsView() {
    btnContainer.toggle();
  }

  function switchAnimateBordersBtn() {
    btnShowBorders.toggleClass('btn-active');
  }

  function switchAnimateMarkersBtn() {
    btnShowMarkers.toggleClass('btn-active');
  }

  const showErrorInformation = () => {
    modalErrorMessage.modal('show');

    setTimeout(() => {
      modalErrorMessage.modal('hide');  
    }, 3000);
  }

  function loadSpinner() {  
    preloader.show();
  }

  function stopLoadSpinner() {
    preloader.delay(100).fadeOut('slow', function () {
      $(this).hide();
    });
  }
});



