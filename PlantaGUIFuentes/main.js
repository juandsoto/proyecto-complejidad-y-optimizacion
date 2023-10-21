const modelSpecification = `
% Lectura de Datos
int: CN; % capacidad central nuclear
int: CT; % capacidad central termica
int: CH; % capacidad central hidroelectrica
int: m;  % cantidad de clientes
int: n;  % cantidad de días a planificar
int: CPN; %costo de producción de la central nuclear.
int: CPT; %costo de producción de la central térmica.
int: CPH; %costo de producción de la central hidroeléctrica.
float: RM; %porcentaje de requerimiento mínimo
array[1..m] of int: P;  %arreglo que representa el pago de cada cliente s
array[1..m, 1..n] of int: d;  %matriz de demanda diaria
int: RA; % número de dias consecutivos en regimen alto
float: PRA; % minimo porcentaje que se considera como regimen alto

% Variables
array[1..n] of var int: PN; % producción de la central nuclear en un día i
array[1..n] of var int: PT; % producción de la central termica en un día i
array[1..n] of var int: PH; % producción de la central hidroelectrica en un día i
array[1..n] of var bool: regimenAlto;
array[1..n] of var bool: aplicarRM;

%Aux
array[1..n] of var int: energia_diaria; % arreglo de la cantidad de energía total diaria(suma de todos los clientes)
array[1..m, 1..n] of var float: d_aux; % matriz auxiliar de la demanda diaria; se modifica si no se satisface la demanda de un día i
array[1..m] of var int: pagos;
array[1..3] of var int: costo_central;
array[1..3] of var int: capacidad_centrales;
var float: RM_aux;

% Restricciones

%No negatividad
constraint assert(CN >= 0, "(CN): La capacidad de la central nuclear debe ser mayor a 0");
constraint assert(CT >= 0, "(CT): La capacidad de la central térmica debe ser mayor a 0");
constraint assert(CH >= 0, "(CH): La capacidad de la central hidroeléctrica debe ser mayor a 0");
constraint assert(m >= 0, "(m): Debe haber por lo menos 1 cliente");
constraint assert(n >= 0, "(n): Debe haber por lo menos 1 dia");
constraint assert(RM >= 0, "(RM): El requerimiento mínimo debe ser un valor entre 0 y 1");
constraint assert(PRA >= 0, "(PRA): El porcentaje de regimen alto debe ser un valor entre 0 y 1");
constraint assert(RA >= 2, "(RA): El numeros de dias consecutivos de regimen alto debe ser mayor a 2");

constraint forall(i in 1..n)(PN[i] >= 0);
constraint forall(i in 1..n)(PT[i] >= 0);
constraint forall(i in 1..n)(PH[i] >= 0);
constraint forall(s in 1..m)(P[s] >= 0);
constraint forall(i in 1..n)(forall(s in 1..m)(d[s,i] >= 0));

%Porcentaje satisfactibilidad

constraint assert(RM <=1, "(RM): El requerimiento mínimo debe ser un valor entre 0 y 1");
constraint assert(PRA <=1, "(PRA): El porcentaje de regimen alto debe ser un valor entre 0 y 1");

%Capacidades

constraint forall(i in 1..n)(PN[i] <= CN);
constraint forall(i in 1..n)(PT[i] <= CT);
constraint forall(i in 1..n)(PH[i] <= CH);

%Mínimos de energia diarios

constraint forall(i in 1..n)(
  energia_diaria[i] = sum(s in 1..m)(d_aux[s,i])
);

constraint forall(i in 1..n)((PN[i]+PT[i]+PH[i]) = energia_diaria[i]);

%Suplir la demanda diaria

constraint forall(i in 1..n)(
  aplicarRM[i] = (energia_diaria[i] > (CN+CT+CH))
);

constraint forall(i in 1..n)(
  if sum(s in 1..m)(d[s,i]) <= (CN+CT+CH) then
    forall(s in 1..m)(d_aux[s,i]=d[s,i])
  elseif sum(s in 1..m)(d[s,i]*RM) <= (CN+CT+CH) then
    forall(s in 1..m)(d_aux[s,i] = d[s,i]*RM) 
  else
    forall(s in 1..m)(d_aux[s,i] = -1) % se pone '-1' en la matriz si no es capaz de suplir la demanda
  endif
);

% Regimen alto

constraint forall(i in 1..n)(
  regimenAlto[i] = (PH[i] > CH*PRA)
);

constraint forall(i in 1..n)(
  (i+RA-1 <= n) -> sum(j in i..(i+RA-1))(regimenAlto[j]) < RA
);

% Variables para mostrar en el output

constraint forall(s in 1..m)(pagos[s] = P[s]);
constraint costo_central = [CPN,CPT,CPH];
constraint capacidad_centrales = [CN,CT,CH];
constraint RM_aux = RM;

% Objetivo

var float: ganancia;
constraint ganancia >= 0;
constraint ganancia = sum(i in 1..n)(
  sum(s in 1..m)(d_aux[s,i]*P[s]) - ((CPN*PN[i])+(CPT*PT[i])+(CPH*PH[i]))
);

solve maximize ganancia;
`;

function toggleForm() {
	const $manual = document.getElementById('manual__form');
	const $automatic = document.getElementById('automatic__form');
	const $toggle = document.getElementById('toggle');
	if ($manual.classList.contains('hidden')) {
		$manual.classList.remove('hidden');
		$automatic.classList.add('hidden');
		$toggle.textContent = 'Automatico';
	} else {
		$automatic.classList.remove('hidden');
		$manual.classList.add('hidden');
		$toggle.textContent = 'Manual';

	}
}

let instancesRunning = 0;


async function runModelWithForm(event) {
	event.preventDefault();

	if (instancesRunning > 0) {
		window.alert("Espera a que el programa termine su ejecución antes de ejecutarlo de nuevo");
		return;
	}

	instancesRunning += 1;
	const $results = document.querySelector(".results__container");
	$results.innerHTML = null;

	const data = getFormData();

	try {
		model = await readModel(data);
		solveModel(model);

	} catch (e) {
		instancesRunning = 0;
		console.error(e);
	}
}
async function runModel(event) {
	event.preventDefault();

	if (instancesRunning > 0) {
		window.alert("Espera a que el programa termine su ejecución antes de ejecutarlo de nuevo");
		return;
	}

	instancesRunning += 1;
	const $results = document.querySelector(".results__container");
	$results.innerHTML = null;
	const $error = document.querySelector(".error");
	$error.classList.add('hidden');

	const $fileInput = document.getElementById("form__input--file");
	const data = await $fileInput.files[0].text();

	try {
		model = await readModel(data);
		solveModel(model);

	} catch (e) {
		instancesRunning = 0;
		console.error(e);
	}
}

async function readModel(data) {

	const model = new MiniZinc.Model();

	model.addDznString(data);
	model.addFile('model.mzn', modelSpecification);

	return model;
}

function solveModel(model) {
	const solve = model.solve({
		options: {
			solver: 'coin-bc',
			'all-solutions': true,
		}
	});
	const $loader = document.querySelector(".loader");
	$loader.classList.remove('hidden');

	solve.on('error', e => {
		$loader.classList.add('hidden');
		console.error(e);
		const $error = document.querySelector(".error");
		$error.classList.remove('hidden');
		$error.textContent = e.message;
		try {
			solve.cancel();
		} catch (e) {
			instancesRunning = 0;
			console.error(e);
		}
	});


	solve.then(result => {
		$loader.classList.add('hidden');
		instancesRunning = 0;
		let solution;
		try {
			solution = result.solution.output.json;
		} catch (e) {
			const $error = document.querySelector(".error");
			$error.classList.remove('hidden');
			$error.textContent = 'Insatisfactible';
			throw new Error('Insatisfactible');
		}
		renderResults(solution);
	});
}

function renderResults(data) {
	console.log(data);
	const $results = document.querySelector(".results__container");

	$results.innerHTML = `
		<h2>Resultados</h2>
		<div class="data__container">
			<span><strong>GANANCIA: </strong></span><span id="ganancia"></span>
		</div>
		<div class="data__container">
			<span><strong>CAPACIDADES: </strong></span><span id="capacidades"></span>
		</div>
		<div class="data__container">
			<span><strong>REQUERIMIENTO MÍNIMO: </strong></span><span id="rm"></span>
		</div>
		<h3>Tabla de demanda diaria</h3>
		<table id="d_aux_table"></table>
	`;

	const dAuxTable = document.getElementById('d_aux_table');

	// Add column headers
	const colHeaderRow = dAuxTable.insertRow();
	colHeaderRow.insertCell(); // Empty cell for the corner
	for (let col = 0; col < data.d_aux[0].length; col++) {
		const colHeaderCell = colHeaderRow.insertCell();
		colHeaderCell.textContent = `dia ${col + 1}`;
	}
	const columnaCostoPorMegawatt = colHeaderRow.insertCell();
	columnaCostoPorMegawatt.textContent = 'costo por megawatt';
	const columnaCostoTotal = colHeaderRow.insertCell();
	columnaCostoTotal.textContent = 'costo total';

	let totalDeTodosLosPagos = 0;
	let totalCostoCentrales = 0;
	// Add row labels and data
	data.d_aux.forEach((subArray, rowIndex) => {
		let totalPagosPorCliente = 0;
		const row = dAuxTable.insertRow();
		const rowHeaderCell = row.insertCell();
		rowHeaderCell.textContent = `cliente ${rowIndex + 1}`;
		subArray.forEach(value => {
			const cell = row.insertCell();
			totalPagosPorCliente += value;
			cell.textContent = value;
		});
		const pagoPorMegawatt = row.insertCell();
		pagoPorMegawatt.textContent = data.pagos[rowIndex];
		const pagoCliente = row.insertCell();
		const pago = totalPagosPorCliente * data.pagos[rowIndex];
		pagoCliente.textContent = pago;
		totalDeTodosLosPagos += pago;
	});

	//TOTAL MEGAWATTS DIARIOS
	const megawattsDiarios = dAuxTable.insertRow();
	megawattsDiarios.insertCell(); // Empty cell for the corner
	for (let col = 0; col < data.d_aux[0].length; col++) {
		const sum = data.d_aux.reduce((acc, subArray) => acc + subArray[col], 0);
		const cell = megawattsDiarios.insertCell();
		cell.textContent = sum;
	}
	megawattsDiarios.insertCell();
	megawattsDiarios.insertCell();

	megawattsDiarios.cells[0].textContent = "TOTAL MEGAWATTS DIARIOS";

	//TOTAL INGRESOS
	const footerRow = dAuxTable.insertRow();
	footerRow.classList.add('highlighted');
	footerRow.insertCell(); // Empty cell for the corner
	for (let col = 0; col < data.d_aux[0].length; col++) {
		footerRow.insertCell();
	}
	footerRow.insertCell();
	const pagoTotalCliente = footerRow.insertCell();
	pagoTotalCliente.textContent = totalDeTodosLosPagos;
	footerRow.cells[0].textContent = "TOTAL INGRESOS";

	//CENTRAL NUCLEAR
	const PNRow = dAuxTable.insertRow();
	PNRow.insertCell();
	let totalNuclear = 0;
	data.PN.forEach(day => {
		PNCell = PNRow.insertCell();
		totalNuclear += day;
		PNCell.textContent = day;
	});
	PNRow.insertCell().textContent = data.costo_central[0];
	const totalCostoNuclear = PNRow.insertCell();
	totalCostoNuclear.textContent = totalNuclear * data.costo_central[0];
	totalCostoCentrales += totalNuclear * data.costo_central[0];
	PNRow.cells[0].textContent = "Producción central nuclear";

	//CENTRAL TERMICA
	const PTRow = dAuxTable.insertRow();
	PTRow.insertCell();
	let totalTermica = 0;
	data.PT.forEach(day => {
		PNCell = PTRow.insertCell();
		totalTermica += day;
		PNCell.textContent = day;
	});
	PTRow.insertCell().textContent = data.costo_central[1];
	const totalCostoTermica = PTRow.insertCell();
	totalCostoTermica.textContent = totalTermica * data.costo_central[1];
	totalCostoCentrales += totalTermica * data.costo_central[1];
	PTRow.cells[0].textContent = "Producción central térmica";

	//CENTRAL HIDROELECTRICA
	const PHRow = dAuxTable.insertRow();
	PHRow.insertCell();
	let totalHidroelectrica = 0;
	data.PH.forEach(day => {
		PNCell = PHRow.insertCell();
		totalHidroelectrica += day;
		PNCell.textContent = day;
	});
	PHRow.insertCell().textContent = data.costo_central[2];
	const totalCostoHidroelectrica = PHRow.insertCell();
	totalCostoHidroelectrica.textContent = totalHidroelectrica * data.costo_central[2];
	totalCostoCentrales += totalHidroelectrica * data.costo_central[2];
	PHRow.cells[0].textContent = "Producción central hidroeléctrica";

	//TOTAL MEGAWATTS DIARIOS
	const produccionDiaria = dAuxTable.insertRow();
	produccionDiaria.insertCell(); // Empty cell for the corner
	for (let col = 0; col < data.d_aux[0].length; col++) {
		const sum = data.PN[col] + data.PT[col] + data.PH[col];
		const cell = produccionDiaria.insertCell();
		cell.textContent = sum;
	}
	produccionDiaria.insertCell();
	produccionDiaria.insertCell();
	produccionDiaria.cells[0].textContent = "TOTAL PRODUCCIÓN DIARIA";

	//TOTAL EGRESOS
	const totalEgresos = dAuxTable.insertRow();
	totalEgresos.classList.add('highlighted');
	totalEgresos.insertCell(); // Empty cell for the corner
	for (let col = 0; col < data.d_aux[0].length; col++) {
		totalEgresos.insertCell();
	}
	totalEgresos.insertCell();
	totalEgresos.insertCell().textContent = totalCostoCentrales;
	totalEgresos.cells[0].textContent = "TOTAL EGRESOS";

	const $ganancia = document.getElementById('ganancia');
	$ganancia.textContent = data.ganancia;

	const $capacidades = document.getElementById('capacidades');
	$capacidades.textContent = JSON.stringify(data.capacidad_centrales);

	const $rm = document.getElementById('rm');
	$rm.textContent = JSON.stringify(data.RM_aux);
}

function getFormData() {
	const CN = document.getElementById("CN").value;
	const CT = document.getElementById("CT").value;
	const CH = document.getElementById("CH").value;
	const m = document.getElementById("m").value;
	const n = document.getElementById("n").value;
	const CPN = document.getElementById("CPN").value;
	const CPT = document.getElementById("CPT").value;
	const CPH = document.getElementById("CPH").value;
	const RM = document.getElementById("RM").value;
	const P = document.getElementById("P").value;
	const d = document.getElementById("d").value;

	const lines = d.split('\n');
	let formatted = `d=[|\n`;
	for (const line of lines) {
		formatted += `${line.trim()}|`;
	}
	formatted += '];\n';

	const dataString = `CN=${CN};\nCT=${CT};\nCH=${CH};\nm=${m};\nn=${n};\nCPN=${CPN};\nCPT=${CPT};\nCPH=${CPH};\nRM=${RM};\nP=[${P}];\n${formatted}`;

	return dataString;
}