Necesito que analices como funciona y todo lo que hace el archivo BudgetAutomation... etc. 
Quiero que hagas lo siguiente. Quiero, que a la tabla final, en la pantalla de presupuesto optimizado añadas una última columna antes de la de beneficio que se llame Rentabilidad €/h.
Ese campo debe tener el mismo valor que el que introducen en rentabilidad en la ventana de Revisar y Editar para cada partida, es decir, hay que arrastrar ese valor.
Lo único que ahora ese valor en la tabla debe ser editable, de manera que si lo editan, se debe calcular en directo el precio de precio IA bajo esta formula:

precio_obj = eur(
        horas_med * rate +
        (mat_med + subc_med) * (1 + margin / 100)
    )

margin es el valor que introducen en revisar y editar en el campo de margen de materiales para cada partida.
Además, como cambia el precio ia, también debe cambiar el beneficio, ya que como verás, el beneficio es precio IA - coste total.
Por último, en la tarjeta que sale encima de la tabla, cambia lo de "Rentabilidad", por "Rentabilidad Neta". 
Responde en español.
