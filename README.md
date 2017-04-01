# MMM-NBA-Standings
Magic Mirror module displaying NBA Standings.

Fetches standings data from the NBA Standings API hosted on https://erikberg.com/api. Credit goes to Erik, the API does a solid job.

## Using the module

To use this module, add it to the modules array in the `config/config.js` file:
````javascript
modules: [{
            module: 'MMM-NBA-Standings',
            position: 'top_left',	// This can be any of the regions.
            config: {
                // See 'Configuration options' for more information.
                conference: 'EAST'
            }
        }
]
````

## Configuration options

The following properties can be configured:

<table width="100%">
	<!-- why, markdown... -->
	<thead>
		<tr>
			<th>Option</th>
			<th width="100%">Description</th>
		</tr>
	<thead>
	<tbody>
		<tr>
			<td><code>conference</code></td>
			<td>Which NBA Conference Standings to display.<br>
				<br><b>Example:</b> <code>'WEST'</code>
				<br><b>Default value:</b> <code>'EAST'</code>
                <br><b>Possible values:</b> <code>'EAST'</code> | <code>'WEST'</code><br><br>
			</td>
		</tr>
    </tbody>
</table>