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

% Variables
array[1..n] of var int: PN; % producción de la central nuclear en un día i
array[1..n] of var int: PT; % producción de la central termica en un día i
array[1..n] of var int: PH; % producción de la central hidroelectrica en un día i

%Aux
array[1..n] of var int: energia_diaria; % arreglo de la cantidad de energía total diaria(suma de todos los clientes)
array[1..m, 1..n] of var int: d_aux; % matriz auxiliar de la demanda diaria; se modifica si no se satisface la demanda de un día i

% Restricciones

  %No negatividad
  constraint assert(CN >= 0, "La capacidad de la central nuclear debe ser mayor a 0");
  constraint assert(CT >= 0, "La capacidad de la central térmica debe ser mayor a 0");
  constraint assert(CH >= 0, "La capacidad de la central hidroeléctrica debe ser mayor a 0");
  constraint assert(m >= 0, "Debe haber por lo menos 1 cliente");
  constraint assert(n >= 0, "Debe haber por lo menos 1 dia");
  constraint assert(RM >= 0, "El requerimiento mínimo debe ser un valor entre 0 y 1");
  constraint forall(i in 1..n)(PN[i] >= 0);
  constraint forall(i in 1..n)(PT[i] >= 0);
  constraint forall(i in 1..n)(PH[i] >= 0);
  constraint forall(s in 1..m)(P[s] >= 0);
  constraint forall(i in 1..n)(forall(s in 1..m)(d[s,i] >= 0));
  
  %Porcentaje satisfactibilidad
  
  constraint assert(RM <=1, "El requerimiento mínimo debe ser un valor entre 0 y 1");
  
  
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
    if sum(s in 1..m)(d[s,i]) <= (CN+CT+CH) then
      forall(s in 1..m)(d_aux[s,i]=d[s,i])
    elseif sum(s in 1..m)(d[s,i]*RM) <= (CN+CT+CH) then
      forall(s in 1..m)(d_aux[s,i] = d[s,i]*RM) 
      else
      forall(s in 1..m)(d_aux[s,i] = -1) % se pone '-1' en la matriz si no es capaz de suplir la demanda
    endif
  );
  
  

% Objetivo
var int: ganancia;


constraint ganancia = sum(s in 1..m)(
  sum(i in 1..n)((d_aux[s,i]*P[s]) - ((CPN*PN[i])+(CPT*PT[i])+(CPH*PH[i])))          
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
		const solution = result.solution.output.json;
		renderResults(solution);
	});
}

function renderResults(data) {
	const $results = document.querySelector(".results__container");

	$results.innerHTML = `
		<h2>Resultados</h2>
		<div class="ganancia__container">
			<span><strong>GANANCIA: </strong></span><span id="ganancia"></span>
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

	// Add row labels and data
	data.d_aux.forEach((subArray, rowIndex) => {
		const row = dAuxTable.insertRow();
		const rowHeaderCell = row.insertCell();
		rowHeaderCell.textContent = `cliente ${rowIndex + 1}`;
		subArray.forEach(value => {
			const cell = row.insertCell();
			cell.textContent = value;
		});
	});

	// Add a footer row to calculate column sums
	const footerRow = dAuxTable.insertRow();
	footerRow.classList.add('highlighted');
	footerRow.insertCell(); // Empty cell for the corner
	for (let col = 0; col < data.d_aux[0].length; col++) {
		const sum = data.d_aux.reduce((acc, subArray) => acc + subArray[col], 0);
		const footerCell = footerRow.insertCell();
		footerCell.textContent = sum;
	}
	footerRow.cells[0].textContent = "TOTAL";

	const PNRow = dAuxTable.insertRow();
	PNRow.insertCell();
	data.PN.forEach(day => {
		PNCell = PNRow.insertCell();
		PNCell.textContent = day;
	});
	PNRow.cells[0].textContent = "Producción central nuclear";

	const PTRow = dAuxTable.insertRow();
	PTRow.insertCell();
	data.PT.forEach(day => {
		PNCell = PTRow.insertCell();
		PNCell.textContent = day;
	});
	PTRow.cells[0].textContent = "Producción central térmica";

	const PHRow = dAuxTable.insertRow();
	PHRow.insertCell();
	data.PH.forEach(day => {
		PNCell = PHRow.insertCell();
		PNCell.textContent = day;
	});
	PHRow.cells[0].textContent = "Producción central hidroeléctrica";

	const $ganancia = document.getElementById('ganancia');
	$ganancia.textContent = data.ganancia;
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