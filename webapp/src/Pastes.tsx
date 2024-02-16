import { useCallback, useState, useEffect } from "react";
import { Box, Hide, Icon, IconButton, Text } from "@chakra-ui/react";
import { MdAdd, MdContentCopy } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { StreamEvent } from "./model";
import axios from "axios";

async function sleep(ms: number) {
  return new Promise<void>((res) => {
    setTimeout(() => {
      res();
    }, ms);
  });
}

function Pastes() {
  const [pastes, setPastes] = useState<StreamEvent[]>([]);
  const navigate = useNavigate();

  const fetchEvents = useCallback(
    async (signal: AbortSignal, lastId: string) => {
      const resp = await axios.get<StreamEvent[]>("/api/event", {
        signal: signal,
        params: { lastId: lastId },
      });
      if (resp.data.length == 0) return lastId;
      resp.data.reverse();
      setPastes((old) => [...resp.data, ...old]);
      return resp.data[0].Id;
    },
    []
  );

  const fetchLoop = useCallback(
    async (signal: AbortSignal) => {
      let lastId = "";
      let errDelay = 5000;

      while (!signal.aborted) {
        try {
          lastId = await fetchEvents(signal, lastId);
          errDelay = 5000;
        } catch (err) {
          console.log("failed to fatch events: ", err);
          if (signal.aborted) break;
          console.log(`next attampt in: ${Math.round(errDelay / 1000)}s`);
          await sleep(errDelay);
          errDelay *= 2;
        }
      }
    },
    [fetchEvents]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    fetchLoop(ctrl.signal).catch(console.error);
    return () => {
      ctrl.abort();
    };
  }, [fetchLoop]);

  const onCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  return (
    <>
      <Hide above="md">
        <IconButton
          position="fixed"
          bottom={6}
          right={6}
          zIndex={2}
          aria-label="Add"
          colorScheme="brand"
          width="56px"
          height="56px"
          borderRadius="16px"
          boxShadow="xl"
          icon={<Icon as={MdAdd} boxSize={8} />}
          onClick={() => navigate("/add-paste")}
        />
      </Hide>

      <Box pb={20}>
        {pastes.map((p) => (
          <Box
            position="relative"
            key={p.Id}
            py={6}
            px={8}
            my={4}
            border="1px"
            borderColor="gray.200"
            borderRadius="24px"
          >
            <Text fontSize="xs" color="gray">
              {new Date(p.Timestamp * 1000).toLocaleString()}
            </Text>

            <Text pt={2} fontSize="sm">
              {p.Payload}
            </Text>

            <IconButton
              position="absolute"
              top={1}
              right={4}
              aria-label="copy"
              variant="ghost"
              size="md"
              onClick={() => onCopy(p.Payload)}
              icon={<Icon color="gray.900" as={MdContentCopy} boxSize={6} />}
            />
          </Box>
        ))}
      </Box>
    </>
  );
}

export default Pastes;
