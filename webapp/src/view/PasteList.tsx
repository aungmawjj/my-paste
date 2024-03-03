import { Box, Show, Icon, IconButton, Text } from "@chakra-ui/react";
import { MdAdd } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useStream } from "../model/stream";
import PasteItem from "./PasteItem";
import { useAuth } from "../model/auth";

function PasteList() {
  const { offline } = useAuth();
  const { streamEvents, isFirstDevice, addPasteText, deletePastes } = useStream();
  const pastes = streamEvents.filter((e) => e.Kind == "PasteText");
  const navigate = useNavigate();

  return (
    <>
      {addPasteText && (
        <Show below="md">
          <IconButton
            position="fixed"
            bottom={8}
            right={8}
            zIndex={2}
            aria-label="Add"
            colorScheme="brand"
            width="64px"
            height="64px"
            borderRadius="16px"
            boxShadow="xl"
            icon={<Icon as={MdAdd} boxSize={8} />}
            onClick={() => navigate("/add-paste")}
          />
        </Show>
      )}

      {pastes.length == 0 && (
        <Box pt={32} textAlign="center" fontSize="lg">
          {addPasteText || offline ? (
            <Text>No Paste Yet!</Text>
          ) : isFirstDevice ? (
            <Text>Setting up...</Text>
          ) : (
            <Text>
              New device request is sent!
              <br />
              Allow from your existing device.
            </Text>
          )}
        </Box>
      )}

      <Box pt={6} pb={28} data-testid="paste-list">
        {streamEvents.map((e) => {
          switch (e.Kind) {
            case "PasteText":
              return <PasteItem paste={e} onDelete={deletePastes} key={e.Id} />;
          }
        })}
      </Box>
    </>
  );
}

export default PasteList;
