#!/bin/bash

solana-test-validator \
==ACCOUNTS==
==PROGRAMS==
==JSON_ACCOUNTS==
	--warp-slot ==WARP_SLOT== \
	--compute-unit-limit 10000000 \
	--url ==CLUSTER==
