$(() => {
    $('.regular').select3({
        noneSelectedText: 'Nothing selected(NS)',
        maxOptionsText: [
            'Limit reached ({n} {var} max(NS))',
            'Group limit reached ({n} {var} max(NS))',
            ['items(NS)', 'item(NS)'],
        ],
        selectAllText: 'Select All(NS)',
        deselectAllText: 'Deselect All(NS)',
    });

    $('.multi').select3({
        iconBase: 'glyphicon',
        tickIcon: 'glyphicon-ok',
        showTick: true,
        showIcon: true,
        multipleSeparator: ', ',
        dropupAuto: false,
    });

    $('.search').select3({
        liveSearch: true,
        actionsBox: true,
        size: 5,
    });

    let selectElement = $('.before_change').select3();
    // Prevent a change. Make sure you don't chain this event in order to make
    // sure that this event handler is called first.
    let select3 = selectElement.data().select3;
    select3.omitChange = true;
    selectElement.on('before_change', (e, clickedElement) => {
        // Doesn't matter which item is clicked; always set the third item.
        select3.selectOption(select3.$menuInner.find('li:eq(2) a'));
    });
});
